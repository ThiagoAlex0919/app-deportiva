/**
 * DTOs HTTP del Marketplace (doc 15).
 */
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { EstadoOrden } from '@prisma/client';

/** Producto del catálogo (config/productos.json — snapshot en la orden). */
export interface ProductoResponse {
  slug: string;
  nombre: string;
  descripcion: string | null;
  precioCop: number;
  imagenUrl: string | null;
  categoria: string | null;
}

/** Respuesta de GET /marketplace/products: catálogo + reglas del simulador. */
export interface CatalogoResponse {
  productos: ProductoResponse[];
  reglas: {
    valorTicketCop: number;
    maxDescuentoPorcentaje: number;
  };
}

export class CrearOrdenDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'productoSlug inválido' })
  productoSlug!: string;

  /** Tickets a canjear como descuento (0 = compra sin descuento). */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ticketsAUsar!: number;

  @IsString()
  @MinLength(8, { message: 'direccion debe ser más específica' })
  direccion!: string;

  @IsString()
  @MinLength(7, { message: 'telefono inválido' })
  telefono!: string;
}

export class CambiarEstadoOrdenDto {
  @IsEnum(EstadoOrden)
  estado!: EstadoOrden;
}

export interface OrdenResponse {
  id: string;
  productoSlug: string;
  productoNombre: string;
  precioCop: number;
  ticketsUsados: number;
  descuentoCop: number;
  totalCop: number;
  estado: string;
  direccion: string;
  telefono: string;
  createdAt: string;
}
