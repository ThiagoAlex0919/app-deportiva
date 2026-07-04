/**
 * DTO de POST /admin/events/:id/finish (doc 10).
 * Carga el resultado global + posiciones por participante y dispara el oráculo.
 */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import type { ResumenResolucion } from '../../../gamification/application/services/oraculo.service';

export class PosicionParticipanteDto {
  @IsUUID('4')
  participanteId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  posicionFinal!: number;
}

export class FinalizarEventoDto {
  /** Resultado global en el Json del deporte: {"marcador":[2,1]}, {"vueltas":78}... */
  @IsObject({ message: 'resultado debe ser un objeto' })
  resultado!: Record<string, unknown>;

  /** Posiciones finales (obligatorio para GANADOR/PODIO en formatos de carrera). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosicionParticipanteDto)
  posiciones?: PosicionParticipanteDto[];
}

export interface FinalizarEventoResponse {
  eventoId: string;
  estado: string;
  oraculo: ResumenResolucion;
}
