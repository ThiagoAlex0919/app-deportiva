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

/* --------------------- Gamificación (Pronósticos) ----------------------- */

export interface CrearPrediccionInput {
  eventoId: string;
  tipo: string; // modalidad: GANADOR, MARCADOR_EXACTO, PODIO...
  payload: Record<string, unknown>;
  costoTickets: number;
}

export interface PrediccionResponse {
  prediccionId: string;
  ledgerTransactionId: string;
  eventoId: string;
  usuarioId: string;
  tipo: string;
  costoTickets: number;
  estado: string;
  yaExistia: boolean;
}

export function crearPrediccion(input: CrearPrediccionInput) {
  return authFetch<PrediccionResponse>(`/gamification/predictions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
