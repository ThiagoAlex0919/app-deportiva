/**
 * CatalogoService — catálogo y reglas del Marketplace (doc 15).
 * Todo vive en config editable (productos.json + marketplace.json), mismo
 * patrón que recompensas/fuentes-rss: cambiar la tienda no toca código.
 */
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RecursoNoEncontradoException } from '../../../../shared/domain/exceptions/domain.exception';
import { CatalogoResponse, ProductoResponse } from '../dto/marketplace.dto';

interface ProductoConfig extends ProductoResponse {
  activo?: boolean;
}

const REGLAS_DEFAULT = { valorTicketCop: 50, maxDescuentoPorcentaje: 30 };

@Injectable()
export class CatalogoService {
  private readonly logger = new Logger(CatalogoService.name);

  listar(): CatalogoResponse {
    return {
      productos: this.productos().filter((p) => p.activo !== false),
      reglas: this.reglas(),
    };
  }

  /** Producto activo por slug — 404 si no existe o está desactivado. */
  obtener(slug: string): ProductoResponse {
    const producto = this.productos().find(
      (p) => p.slug === slug && p.activo !== false,
    );
    if (!producto) throw new RecursoNoEncontradoException('Producto', slug);
    return producto;
  }

  reglas(): { valorTicketCop: number; maxDescuentoPorcentaje: number } {
    try {
      const crudo = readFileSync(
        join(process.cwd(), 'config', 'marketplace.json'),
        'utf8',
      );
      const json = JSON.parse(crudo) as Record<string, unknown>;
      return {
        valorTicketCop:
          typeof json.valorTicketCop === 'number' && json.valorTicketCop > 0
            ? json.valorTicketCop
            : REGLAS_DEFAULT.valorTicketCop,
        maxDescuentoPorcentaje:
          typeof json.maxDescuentoPorcentaje === 'number' &&
          json.maxDescuentoPorcentaje > 0 &&
          json.maxDescuentoPorcentaje <= 100
            ? json.maxDescuentoPorcentaje
            : REGLAS_DEFAULT.maxDescuentoPorcentaje,
      };
    } catch {
      return REGLAS_DEFAULT;
    }
  }

  private productos(): ProductoConfig[] {
    try {
      const crudo = readFileSync(
        join(process.cwd(), 'config', 'productos.json'),
        'utf8',
      );
      const json = JSON.parse(crudo) as unknown;
      if (!Array.isArray(json)) return [];
      return json
        .filter(
          (p): p is ProductoConfig =>
            typeof p === 'object' &&
            p !== null &&
            typeof (p as ProductoConfig).slug === 'string' &&
            typeof (p as ProductoConfig).nombre === 'string' &&
            typeof (p as ProductoConfig).precioCop === 'number',
        )
        .map((p) => ({
          slug: p.slug,
          nombre: p.nombre,
          descripcion: p.descripcion ?? null,
          precioCop: p.precioCop,
          imagenUrl: p.imagenUrl ?? null,
          categoria: p.categoria ?? null,
          activo: p.activo,
        }));
    } catch {
      this.logger.error('config/productos.json ilegible — tienda vacía');
      return [];
    }
  }
}
