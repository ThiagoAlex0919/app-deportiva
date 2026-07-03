/**
 * Cliente HTTP del backend NestJS (contrato en 05_estado_del_proyecto.md).
 *
 * Errores de negocio llegan como { statusCode, codigo, mensaje, timestamp, path }.
 * TEMPORAL: usuarioId viaja por query/body hasta que exista el módulo users (JWT).
 */

// Prioridad: env var (Vercel/local) → producción (Render) → dev local.
// En desarrollo usa .env.local (ver .env.example) para apuntar a localhost.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://app-deportiva-api.onrender.com/api/v1"
    : "http://localhost:3000/api/v1");

/** Contrato de error del backend (filtro global de DomainException). */
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
      mensaje: "No se pudo conectar con el servidor. ¿Está corriendo el backend?",
    });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      body ?? {
        statusCode: res.status,
        codigo: "ERROR_DESCONOCIDO",
        mensaje: `Error ${res.status}`,
      },
    );
  }
  return res.json() as Promise<T>;
}

/* ------------------------- Ledger (Billetera) ------------------------- */

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

export function getBalance(usuarioId: string) {
  return request<SaldoResponse>(`/ledger/balance?usuarioId=${usuarioId}`);
}

export function getHistory(usuarioId: string, cursor?: string, limit = 20) {
  const params = new URLSearchParams({ usuarioId, limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return request<HistorialResponse>(`/ledger/history?${params}`);
}

/* --------------------- Gamificación (Pronósticos) ---------------------- */

export interface CrearPrediccionInput {
  usuarioId: string;
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
  return request<PrediccionResponse>(`/gamification/predictions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
