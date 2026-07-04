/**
 * DTOs HTTP del catálogo deportivo (08_modulo_sports_y_home.md).
 *
 * La respuesta incluye `deporte.formato` como DISCRIMINADOR DE ESTRATEGIA
 * para la UI (mismo patrón Strategy del schema): EQUIPOS → widget de
 * marcador exacto; MULTITUDINARIO → widget de podio. Añadir un deporte
 * nuevo no requiere tocar el frontend.
 */
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { EstadoEvento } from '@prisma/client';

/** Query de GET /sports/events */
export class ConsultarEventosQueryDto {
  @IsOptional()
  @IsEnum(EstadoEvento)
  estado: EstadoEvento = EstadoEvento.PROGRAMADO;

  /** Id del último evento visto; omitir para la primera página. */
  @IsOptional()
  @IsUUID('4')
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

export interface ParticipanteEventoResponse {
  id: string;
  nombre: string;
  slug: string;
  rol: string; // LOCAL | VISITANTE | COMPETIDOR
}

export interface EventoResponse {
  id: string;
  nombre: string;
  fase: string | null;
  fechaInicio: string;
  estado: string;
  competicion: { nombre: string; slug: string };
  deporte: { nombre: string; slug: string; formato: string };
  participantes: ParticipanteEventoResponse[];
}

export interface EventosResponse {
  eventos: EventoResponse[];
  nextCursor: string | null;
}
