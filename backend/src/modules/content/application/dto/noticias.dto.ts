/**
 * DTOs HTTP del feed de noticias (doc 11).
 */
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** Query de GET /content/news */
export class ConsultarNoticiasQueryDto {
  /** Filtro por deporte ("futbol", "formula-1"); omitir para todo el feed. */
  @IsOptional()
  @IsString()
  deporte?: string;

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

export interface NoticiaResponse {
  id: string;
  titulo: string;
  resumen: string | null;
  url: string;
  imagenUrl: string | null;
  fuente: string;
  deporteSlug: string | null;
  publicadaEn: string;
}

export interface NoticiasResponse {
  noticias: NoticiaResponse[];
  nextCursor: string | null;
}
