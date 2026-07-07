/**
 * Cliente HTTP del backend NestJS (contrato en 05/07).
 *
 * Autenticación (07_modulo_users_jwt.md):
 *  - Toda ruta protegida va con `Authorization: Bearer <accessToken>`.
 *  - Si el access expiró (401), se intenta UNA rotación vía /auth/refresh
 *    (con lock para no rotar en paralelo) y se reintenta la petición.
 *  - Si el refresh también falla, la sesión se limpia y el caller recibe
 *    SESION_EXPIRADA para redirigir a /login.
 *
 * Errores de negocio llegan como { statusCode, codigo, mensaje, ... }.
 */
import { useSession, type PerfilUsuario } from "./store";

// Prioridad: env var (Vercel/local) → producción (Render) → dev local.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://app-deportiva-api.onrender.com/api/v1"
    : "http://localhost:3000/api/v1");

export interface ApiError {
  statusCode: number;
  codigo: string;
  mensaje: string;
  timestamp?: string;
  path?: string;
}

export class ApiRequestError extends Error {
  constructor(public readonly error: ApiError) {
    super(error.mensaje);
    this.name = "ApiRequestError";
  }
}

/* ------------------------------ núcleo HTTP ----------------------------- */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiRequestError({
      statusCode: 0,
      codigo: "BACKEND_NO_DISPONIBLE",
      mensaje:
        "No se pudo conectar con el servidor. Puede estar despertando; reintenta en unos segundos.",
    });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | (ApiError & { message?: string })
      | null;
    throw new ApiRequestError(
      body?.codigo
        ? body
        : {
            statusCode: res.status,
            codigo: body?.codigo ?? "ERROR_DESCONOCIDO",
            // NestJS UnauthorizedException anida el payload en `message`.
            mensaje:
              (body?.message as ApiError | undefined)?.mensaje ??
              body?.mensaje ??
              `Error ${res.status}`,
          },
    );
  }
  return res.json() as Promise<T>;
}

/** Lock de rotación: evita N refresh simultáneos cuando expiran N fetches. */
let refreshEnCurso: Promise<void> | null = null;

async function rotarTokens(): Promise<void> {
  const { refreshToken, setSesion, clearSesion } = useSession.getState();
  if (!refreshToken) {
    throw new ApiRequestError({
      statusCode: 401,
      codigo: "SESION_EXPIRADA",
      mensaje: "Inicia sesión para continuar.",
    });
  }
  try {
    const auth = await request<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    setSesion(auth);
  } catch {
    clearSesion();
    throw new ApiRequestError({
      statusCode: 401,
      codigo: "SESION_EXPIRADA",
      mensaje: "Tu sesión expiró. Inicia sesión de nuevo.",
    });
  }
}

/** Petición autenticada con reintento único tras rotar el access token. */
async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const intentar = () => {
    const { accessToken } = useSession.getState();
    return request<T>(path, {
      ...init,
      headers: {
        ...init?.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
  };

  // Sin access en memoria (recarga de página) → rotar primero.
  if (!useSession.getState().accessToken) {
    refreshEnCurso ??= rotarTokens().finally(() => (refreshEnCurso = null));
    await refreshEnCurso;
    return intentar();
  }

  try {
    return await intentar();
  } catch (e) {
    if (e instanceof ApiRequestError && e.error.statusCode === 401) {
      refreshEnCurso ??= rotarTokens().finally(() => (refreshEnCurso = null));
      await refreshEnCurso;
      return intentar();
    }
    throw e;
  }
}

/* ------------------------------ Auth ------------------------------------ */

export interface AuthResponse {
  usuario: PerfilUsuario;
  accessToken: string;
  refreshToken: string;
}

export async function registrar(input: {
  email: string;
  password: string;
  nombre?: string;
}): Promise<AuthResponse> {
  const auth = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  useSession.getState().setSesion(auth);
  return auth;
}

export async function iniciarSesion(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const auth = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  useSession.getState().setSesion(auth);
  return auth;
}

export async function cerrarSesion(): Promise<void> {
  const { refreshToken, clearSesion } = useSession.getState();
  clearSesion(); // primero la UI: el logout remoto es best-effort
  if (refreshToken) {
    await request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
}

/* ------------------------- Ledger (Billetera) --------------------------- */

export interface SaldoResponse {
  usuarioId: string;
  saldo: number; // derivado del ledger, nunca almacenado
  calculadoEn: string;
}

export interface Movimiento {
  asientoId: string;
  fecha: string;
  direccion: "DEBITO" | "CREDITO";
  cantidad: number;
  modulo: string;
  motivo: string;
  descripcion: string | null;
  transaccionId: string;
}

export interface HistorialResponse {
  usuarioId: string;
  movimientos: Movimiento[];
  nextCursor: string | null;
}

export function getBalance() {
  return authFetch<SaldoResponse>(`/ledger/balance`);
}

export function getHistory(cursor?: string, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return authFetch<HistorialResponse>(`/ledger/history?${params}`);
}

/* ----------------------- Sports (catálogo público) ---------------------- */

export interface ParticipanteEvento {
  id: string;
  nombre: string;
  slug: string;
  rol: string; // LOCAL | VISITANTE | COMPETIDOR
  /** Escudo real del equipo (sync de fixtures, doc 12). */
  imagenUrl: string | null;
}

export interface EventoCatalogo {
  id: string;
  nombre: string;
  fase: string | null;
  fechaInicio: string;
  estado: string;
  competicion: { nombre: string; slug: string };
  /** `formato` es el discriminador de estrategia de la UI (doc 08):
   *  EQUIPOS → widget marcador exacto; MULTITUDINARIO → widget podio. */
  deporte: { nombre: string; slug: string; formato: string };
  participantes: ParticipanteEvento[];
}

export interface EventosResponse {
  eventos: EventoCatalogo[];
  nextCursor: string | null;
}

/** Catálogo público: sin token (el Home funciona sin sesión). */
export function getEventos(cursor?: string, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return request<EventosResponse>(`/sports/events?${params}`);
}

/* ------------------- Detalle de partido en vivo (doc 13) ---------------- */

export interface MomentoPartido {
  minuto: number | null;
  tipo: "GOL" | "TARJETA_AMARILLA" | "TARJETA_ROJA" | "CAMBIO";
  participanteId: string | null;
  jugador: string | null;
  detalle: string | null;
}

export interface FilaCaminoTorneo {
  participanteId: string;
  grupo: string | null;
  posicion: number;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  puntos: number;
}

export interface DetallePartido {
  evento: EventoCatalogo;
  minuto: string | null;
  marcador: {
    actual: [number, number] | null;
    medioTiempo: [number, number] | null;
  };
  cronologia: MomentoPartido[];
  ficha: { arbitro: string | null; estadio: string | null };
  caminoTorneo: FilaCaminoTorneo[];
}

export function getEventoDetalle(id: string) {
  return request<DetallePartido>(`/sports/events/${id}/detail`);
}

/* ----------------------- Content (noticias RSS) ------------------------- */

export interface Noticia {
  id: string;
  titulo: string;
  resumen: string | null;
  url: string; // link al medio original (crédito obligatorio)
  imagenUrl: string | null;
  fuente: string;
  deporteSlug: string | null;
  publicadaEn: string;
}

export interface NoticiasResponse {
  noticias: Noticia[];
  nextCursor: string | null;
}

/** Feed público (doc 11): sin token. */
export function getNoticias(cursor?: string, limit = 10) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return request<NoticiasResponse>(`/content/news?${params}`);
}

/** Detalle para la página interna /noticia/[id]. */
export function getNoticia(id: string) {
  return request<Noticia>(`/content/news/${id}`);
}

/* --------------------- Gamificación (Pronósticos) ----------------------- */

export interface MiPrediccion {
  prediccionId: string;
  eventoId: string;
  tipo: string;
  payload: Record<string, unknown>;
  estado: string; // PENDIENTE | ACERTADA | FALLADA | ANULADA
  /** Tickets ganados si ACERTADA (doc 10); null en el resto. */
  recompensaTickets: number | null;
  createdAt: string;
}

export function getMisPredicciones(eventoId?: string) {
  const params = eventoId ? `?eventoId=${eventoId}` : "";
  return authFetch<{ predicciones: MiPrediccion[] }>(
    `/gamification/predictions/mine${params}`,
  );
}

/** ECONOMÍA v2 (doc 09): pronosticar es gratis — sin costoTickets. */
export interface CrearPrediccionInput {
  eventoId: string;
  tipo: string; // modalidad: GANADOR, MARCADOR_EXACTO, PODIO...
  payload: Record<string, unknown>;
}

export interface PrediccionResponse {
  prediccionId: string;
  eventoId: string;
  usuarioId: string;
  tipo: string;
  estado: string;
  yaExistia: boolean;
}

export function crearPrediccion(input: CrearPrediccionInput) {
  return authFetch<PrediccionResponse>(`/gamification/predictions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
