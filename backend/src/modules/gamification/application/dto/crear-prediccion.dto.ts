/**
 * DTO HTTP de POST /gamification/predictions.
 *
 * Deuda técnica RESUELTA (07_modulo_users_jwt.md): el usuario ya no viaja
 * en el body — sale del access token vía @CurrentUser en el controller.
 */
import { IsObject, IsString, IsUUID, Matches } from 'class-validator';

export class CrearPrediccionDto {
  /** Evento (partido, carrera...) sobre el que se pronostica. */
  @IsUUID('4', { message: 'eventoId debe ser un UUID v4 válido' })
  eventoId!: string;

  /**
   * Modalidad del pronóstico: "MARCADOR_EXACTO", "GANADOR", "PODIO"...
   * Aquí solo se valida el FORMATO; la pertenencia al catálogo vigente la
   * valida el dominio (modalidades.ts) — así añadir modalidades no toca el DTO.
   */
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'tipo debe ir en MAYUSCULAS_CON_GUION_BAJO (ej. MARCADOR_EXACTO)',
  })
  tipo!: string;

  /**
   * La predicción en sí — estructura flexible según deporte y modalidad
   * (mismo principio Json del schema): {"marcador":[2,1]} en fútbol,
   * {"podio":["<id1>","<id2>","<id3>"]} en F1. La interpreta el oráculo
   * al finalizar el evento.
   */
  @IsObject({ message: 'payload debe ser un objeto' })
  payload!: Record<string, unknown>;

  // ECONOMÍA v2 (doc 09): pronosticar es GRATIS — ya no existe costoTickets.
  // El cobro queda reservado a la inscripción de torneos (módulo futuro).
}

/** Respuesta de GET /gamification/predictions/mine (docs 08/10). */
export interface MisPrediccionesResponse {
  predicciones: Array<{
    prediccionId: string;
    eventoId: string;
    tipo: string;
    payload: Record<string, unknown>;
    estado: string;
    /** Tickets ganados si estado=ACERTADA; null en el resto. */
    recompensaTickets: number | null;
    createdAt: string;
  }>;
}

/** Respuesta del endpoint. */
export interface PrediccionResponse {
  prediccionId: string;
  eventoId: string;
  usuarioId: string;
  tipo: string;
  estado: string;
  /** true si esta llamada fue un reintento idempotente (ya existía). */
  yaExistia: boolean;
}
