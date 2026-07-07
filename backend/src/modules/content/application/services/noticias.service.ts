/**
 * NoticiasService — feed de noticias agregado por RSS (doc 11).
 *
 * Estrategia de frescura SIN cron: refresco on-demand con caché de 15 min.
 * El keep-alive del repo (ping cada 10 min a /content/news) mantiene el
 * feed actualizado como efecto colateral de mantener despierto el servicio.
 *
 * Resiliencia: cada fuente se descarga con timeout y sus errores se
 * registran y se ignoran — una fuente caída jamás tumba el feed.
 */
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// rss-parser es CommonJS puro (module.exports = Parser) y el tsconfig no usa
// esModuleInterop: `import ... = require(...)` es la forma que funciona en
// compilación Y en runtime (un default import emitiría `.default` → undefined).
import Parser = require('rss-parser');
import { RecursoNoEncontradoException } from '../../../../shared/domain/exceptions/domain.exception';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  NoticiasResponse,
} from '../dto/noticias.dto';

/** Fuente declarada en config/fuentes-rss.json (editable sin código). */
interface FuenteRss {
  nombre: string;
  url: string;
  deporteSlug?: string;
}

const REFRESCO_MS = 15 * 60 * 1000; // 15 min
const TIMEOUT_FUENTE_MS = 5_000;
const MAX_ITEMS_POR_FUENTE = 30;

@Injectable()
export class NoticiasService {
  private readonly logger = new Logger(NoticiasService.name);
  private readonly parser = new Parser({
    timeout: TIMEOUT_FUENTE_MS,
    customFields: {
      item: [
        ['media:content', 'mediaContent', { keepArray: true }],
        ['media:thumbnail', 'mediaThumbnail'],
      ],
    },
  });

  /** Marca de la última agregación exitosa (memoria del proceso). */
  private ultimaAgregacion = 0;
  /** Lock: si N requests llegan a la vez, solo uno agrega. */
  private agregacionEnCurso: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Feed paginado; dispara el refresco si la caché venció. */
  async listar(opciones: {
    deporte?: string;
    cursor?: string;
    limit: number;
  }): Promise<NoticiasResponse> {
    await this.refrescarSiVencio();

    const filas = await this.prisma.noticia.findMany({
      where: opciones.deporte ? { deporteSlug: opciones.deporte } : {},
      orderBy: [{ publicadaEn: 'desc' }, { id: 'desc' }],
      take: opciones.limit + 1,
      ...(opciones.cursor
        ? { cursor: { id: opciones.cursor }, skip: 1 }
        : {}),
    });

    const hayMas = filas.length > opciones.limit;
    const pagina = hayMas ? filas.slice(0, opciones.limit) : filas;

    return {
      noticias: pagina.map((n) => ({
        id: n.id,
        titulo: n.titulo,
        resumen: n.resumen,
        url: n.url,
        imagenUrl: n.imagenUrl,
        fuente: n.fuente,
        deporteSlug: n.deporteSlug,
        publicadaEn: n.publicadaEn.toISOString(),
      })),
      nextCursor: hayMas ? pagina[pagina.length - 1].id : null,
    };
  }

  /** Detalle de una noticia (página interna /noticia/[id] del frontend). */
  async obtener(id: string) {
    const n = await this.prisma.noticia.findUnique({ where: { id } });
    if (!n) {
      throw new RecursoNoEncontradoException('Noticia', id);
    }
    return {
      id: n.id,
      titulo: n.titulo,
      resumen: n.resumen,
      url: n.url,
      imagenUrl: n.imagenUrl,
      fuente: n.fuente,
      deporteSlug: n.deporteSlug,
      publicadaEn: n.publicadaEn.toISOString(),
    };
  }

  // ------------------------------------------------------------------
  // Agregación RSS
  // ------------------------------------------------------------------

  private async refrescarSiVencio(): Promise<void> {
    if (Date.now() - this.ultimaAgregacion < REFRESCO_MS) return;
    // ??=: si ya hay una agregación corriendo, este request la espera
    // en lugar de lanzar otra en paralelo.
    this.agregacionEnCurso ??= this.agregar().finally(() => {
      this.agregacionEnCurso = null;
    });
    await this.agregacionEnCurso;
  }

  private async agregar(): Promise<void> {
    const fuentes = this.cargarFuentes();
    const resultados = await Promise.allSettled(
      fuentes.map((f) => this.agregarFuente(f)),
    );

    let nuevas = 0;
    resultados.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        nuevas += r.value;
      } else {
        // Fuente caída/cambiada: log y seguir — se corrige editando el JSON.
        this.logger.warn(
          `Fuente RSS "${fuentes[i].nombre}" falló: ${String(r.reason)}`,
        );
      }
    });

    this.ultimaAgregacion = Date.now();
    this.logger.log(
      `Agregación RSS: ${fuentes.length} fuentes, ${nuevas} noticias nuevas`,
    );
  }

  /** @returns cuántas noticias NUEVAS insertó esta fuente. */
  private async agregarFuente(fuente: FuenteRss): Promise<number> {
    const feed = await this.parser.parseURL(fuente.url);
    let nuevas = 0;

    for (const item of (feed.items ?? []).slice(0, MAX_ITEMS_POR_FUENTE)) {
      const url = item.link?.trim();
      const titulo = item.title?.trim();
      if (!url || !titulo) continue; // sin link o título no hay noticia

      const imagenUrl = this.extraerImagen(item);
      const creada = await this.prisma.noticia.upsert({
        where: { url },
        // Dedupe: el contenido no se reescribe, pero la imagen SÍ se puede
        // mejorar (las noticias ya guardadas adoptan la resolución alta).
        update: imagenUrl ? { imagenUrl } : {},
        create: {
          titulo,
          resumen: this.limpiarResumen(item.contentSnippet),
          url,
          imagenUrl,
          fuente: fuente.nombre,
          deporteSlug: fuente.deporteSlug ?? null,
          publicadaEn: item.isoDate ? new Date(item.isoDate) : new Date(),
        },
      });
      // upsert no distingue crear/existente; aproximamos por timestamp.
      if (Date.now() - creada.createdAt.getTime() < 5_000) nuevas += 1;
    }
    return nuevas;
  }

  /** contentSnippet ya viene sin HTML; solo truncamos con elipsis. */
  private limpiarResumen(texto?: string): string | null {
    const limpio = texto?.replace(/\s+/g, ' ').trim();
    if (!limpio) return null;
    return limpio.length > 280 ? `${limpio.slice(0, 279)}…` : limpio;
  }

  /**
   * Imagen: elige la de MAYOR resolución entre todos los candidatos del item
   * (media:content puede traer varias variantes con width/height) y aplica
   * mejoras por CDN conocido — muchos feeds publican thumbnails de 240px
   * pero el mismo CDN sirve la versión grande cambiando un segmento de la URL.
   */
  private extraerImagen(item: {
    enclosure?: { url?: string };
    mediaContent?: Array<{ $?: { url?: string; width?: string } }>;
    mediaThumbnail?:
      | { $?: { url?: string; width?: string } }
      | Array<{ $?: { url?: string; width?: string } }>;
  }): string | null {
    const candidatos: Array<{ url: string; ancho: number }> = [];

    const agregar = (url?: string, width?: string) => {
      if (url) candidatos.push({ url, ancho: Number(width) || 0 });
    };

    agregar(item.enclosure?.url);
    for (const m of item.mediaContent ?? []) agregar(m.$?.url, m.$?.width);
    const thumbs = Array.isArray(item.mediaThumbnail)
      ? item.mediaThumbnail
      : item.mediaThumbnail
        ? [item.mediaThumbnail]
        : [];
    for (const t of thumbs) agregar(t.$?.url, t.$?.width);

    if (candidatos.length === 0) return null;
    // Mayor ancho declarado gana; sin metadatos, el primer candidato.
    candidatos.sort((a, b) => b.ancho - a.ancho);
    return this.mejorarResolucion(candidatos[0].url);
  }

  /** Upgrades seguros por CDN conocido (si el patrón no matchea, se respeta la URL). */
  private mejorarResolucion(url: string): string {
    // BBC (ichef.bbci.co.uk): .../ace/standard/240/... → variante de 976px.
    if (url.includes('ichef.bbci.co.uk')) {
      return url.replace(/\/(standard|ws)\/(\d{2,4})\//, '/$1/976/');
    }
    // La Vanguardia / Mundo Deportivo: .../690x450/... o parámetro de resize.
    if (url.includes('mundodeportivo') || url.includes('lavanguardia')) {
      return url.replace(/\/(\d{2,4})x(\d{2,4})\//, '/1200x675/');
    }
    return url;
  }

  private cargarFuentes(): FuenteRss[] {
    try {
      const crudo = readFileSync(
        join(process.cwd(), 'config', 'fuentes-rss.json'),
        'utf8',
      );
      const json = JSON.parse(crudo) as unknown;
      if (!Array.isArray(json)) return [];
      return json.filter(
        (f): f is FuenteRss =>
          typeof f === 'object' &&
          f !== null &&
          typeof (f as FuenteRss).nombre === 'string' &&
          typeof (f as FuenteRss).url === 'string',
      );
    } catch {
      this.logger.error('config/fuentes-rss.json ilegible — feed sin fuentes');
      return [];
    }
  }
}
