/**
 * EventosService — lecturas del catálogo deportivo (08_modulo_sports_y_home.md).
 *
 * Solo LECTURA en esta fase: los datos entran por seed; la escritura
 * (crear eventos, cerrar resultados) llegará con el panel admin/oráculo.
 * Acceso directo a Prisma (misma decisión pragmática que Gamification:
 * un puerto/adaptador para consultas de catálogo sería ceremonia sin valor).
 */
import { Injectable } from '@nestjs/common';
import { EstadoEvento, Prisma } from '@prisma/client';
import { RecursoNoEncontradoException } from '../../../../shared/domain/exceptions/domain.exception';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  EventoResponse,
  EventosResponse,
} from '../dto/eventos.dto';

/** Include estándar: todo lo que la UI necesita para pintar un evento. */
const INCLUDE_EVENTO = {
  participantes: { include: { participante: true } },
  temporada: { include: { competicion: { include: { deporte: true } } } },
} satisfies Prisma.EventoInclude;

type EventoConRelaciones = Prisma.EventoGetPayload<{
  include: typeof INCLUDE_EVENTO;
}>;

@Injectable()
export class EventosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Próximos eventos ordenados por fecha, paginados por cursor.
   * Orden estable: (fechaInicio, id) — el id desempata fechas idénticas,
   * requisito para que el cursor no salte ni repita filas.
   */
  async listar(opciones: {
    estado: EstadoEvento;
    cursor?: string;
    limit: number;
  }): Promise<EventosResponse> {
    const filas = await this.prisma.evento.findMany({
      where: { estado: opciones.estado },
      orderBy: [{ fechaInicio: 'asc' }, { id: 'asc' }],
      // take limit+1: la fila extra revela si existe página siguiente.
      take: opciones.limit + 1,
      ...(opciones.cursor
        ? { cursor: { id: opciones.cursor }, skip: 1 } // skip 1: excluir el cursor mismo
        : {}),
      include: INCLUDE_EVENTO,
    });

    const hayMas = filas.length > opciones.limit;
    const pagina = hayMas ? filas.slice(0, opciones.limit) : filas;

    return {
      eventos: pagina.map((e) => this.aResponse(e)),
      nextCursor: hayMas ? pagina[pagina.length - 1].id : null,
    };
  }

  /** Detalle de un evento. */
  async obtener(id: string): Promise<EventoResponse> {
    const evento = await this.prisma.evento.findUnique({
      where: { id },
      include: INCLUDE_EVENTO,
    });
    if (!evento) throw new RecursoNoEncontradoException('Evento', id);
    return this.aResponse(evento);
  }

  private aResponse(e: EventoConRelaciones): EventoResponse {
    const competicion = e.temporada.competicion;
    return {
      id: e.id,
      nombre: e.nombre,
      fase: e.fase,
      fechaInicio: e.fechaInicio.toISOString(),
      estado: e.estado,
      competicion: { nombre: competicion.nombre, slug: competicion.slug },
      deporte: {
        nombre: competicion.deporte.nombre,
        slug: competicion.deporte.slug,
        formato: competicion.deporte.formato,
      },
      participantes: e.participantes.map((p) => ({
        id: p.participante.id,
        nombre: p.participante.nombre,
        slug: p.participante.slug,
        rol: p.rol,
      })),
    };
  }
}
