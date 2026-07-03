/**
 * DTO HTTP de POST /gamification/predictions.
 *
 * TEMPORAL: `usuarioId` viaja en el body hasta que exista el módulo users
 * (JWT); entonces saldrá del token y se eliminará de aquí.
 */
import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CrearPrediccionDto {
  /** Usuario que realiza el pronóstico. */
  @IsUUID('4', { message: 'usuarioId debe ser un UUID v4 válido' })
  usuarioId!: string;

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

  /** Costo de inscripción en Tickets (entero > 0). */
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'costoTickets debe ser al menos 1' })
  costoTickets!: number;
}

/** Respuesta del endpoint. */
export interface PrediccionResponse {
  /** Id de la predicción persistida (= referenciaId en el ledger). */
  prediccionId: string;
  /** Transacción del ledger que cobró la inscripción. */
  ledgerTransactionId: string;
  eventoId: string;
  usuarioId: string;
  tipo: string;
  costoTickets: number;
  estado: string;
  /** true si esta llamada fue un reintento idempotente (ya existía). */
  yaExistia: boolean;
}
