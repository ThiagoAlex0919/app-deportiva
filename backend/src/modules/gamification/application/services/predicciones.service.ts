/**
 * PrediccionesService — caso de uso "crear pronóstico" con soporte de
 * MÚLTIPLES MODALIDADES (MARCADOR_EXACTO, GANADOR, PODIO, ...).
 *
 * Flujo:
 *   1. Validar modalidad contra el catálogo del dominio (modalidades.ts).
 *   2. Validar que el evento existe y sigue PROGRAMADO (no se apuesta en vivo).
 *   3. Cobrar la inscripción vía LedgerService (fachada del módulo Economía):
 *      DEBITO billetera del usuario / CREDITO cuenta de sistema REDENCION.
 *   4. Persistir la Prediccion (tipo + payload flexible) con el MISMO id que
 *      viaja como referencia polimórfica en el ledger.
 *
 * Idempotencia y regla de negocio (alineadas 1:1):
 *   - idempotencyKey = PRONOSTICO:{usuarioId}:{eventoId}:{tipo}
 *   - @@unique([usuarioId, eventoId, tipo]) en la BD
 *   => un usuario puede tener varias predicciones en un evento (una por
 *      modalidad), pero repetir modalidad no cobra dos veces.
 *
 * NOTA DE ATOMICIDAD (registrada en doc 05): el cobro (ledger) y la fila
 * Prediccion se escriben en dos transacciones. Si el proceso muriera entre
 * ambas, el upsert del paso 4 "repara" en el siguiente reintento con la
 * misma clave. La unificación en una sola transacción requiere extender el
 * contrato del Ledger (candidato para la parte 2 de la Fase 2).
 */
import { Injectable, Logger } from '@nestjs/common';
import { EstadoEvento, Prisma } from '@prisma/client';
import {
  DomainException,
  RecursoNoEncontradoException,
} from '../../../../shared/domain/exceptions/domain.exception';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  MODALIDADES_SOPORTADAS,
  esModalidadSoportada,
} from '../../domain/modalidades';
import { recompensaPorModalidad } from '../../domain/recompensas';
import {
  CrearPrediccionDto,
  MisPrediccionesResponse,
  PrediccionResponse,
} from '../dto/crear-prediccion.dto';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PrediccionesService {
  private readonly logger = new Logger(PrediccionesService.name);

  constructor(
    // NOTA ECONOMÍA v2: este servicio ya no toca el Ledger (pronosticar es
    // gratis). El oráculo (recompensas por acierto) y el módulo de Torneos
    // (inscripción con premio físico) volverán a inyectar LedgerService.
    // TODO(SportsModule): cuando exista la fachada EventosService, la
    // consulta de solo-lectura al Evento debe pasar por ella en lugar de
    // tocar Prisma directamente (excepción pragmática y documentada).
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Pronósticos del usuario autenticado, opcionalmente filtrados por evento.
   * Alimenta el widget del Home: mostrar "ya pronosticaste X" al cargar en
   * lugar de descubrirlo con el `yaExistia` del POST (doc 08).
   */
  async listarMias(
    usuarioId: string,
    eventoId?: string,
  ): Promise<MisPrediccionesResponse> {
    const filas = await this.prisma.prediccion.findMany({
      where: { usuarioId, ...(eventoId ? { eventoId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100, // suficiente para la UI actual; paginar cuando exista historial largo
      // Contexto del evento para la Zona de Juego (doc 14): un solo join.
      include: {
        evento: {
          include: {
            participantes: { include: { participante: true } },
            temporada: { include: { competicion: true } },
          },
        },
      },
    });

    const predicciones = filas.map((p) => ({
      prediccionId: p.id,
      eventoId: p.eventoId,
      tipo: p.tipo,
      payload: p.payload as Record<string, unknown>,
      estado: p.estado,
      // Recompensa pagada al acertar (desde config/recompensas.json).
      // NOTA: si el negocio cambia los montos, las ACERTADAS históricas
      // mostrarían el monto nuevo — aceptable con valores dummy; al
      // aterrizar el modelo, leer el monto real desde el Ledger.
      recompensaTickets:
        p.estado === 'ACERTADA' && esModalidadSoportada(p.tipo)
          ? recompensaPorModalidad(p.tipo)
          : null,
      createdAt: p.createdAt.toISOString(),
      evento: {
        id: p.evento.id,
        nombre: p.evento.nombre,
        fechaInicio: p.evento.fechaInicio.toISOString(),
        estado: p.evento.estado,
        competicion: p.evento.temporada.competicion.nombre,
        participantes: p.evento.participantes.map((ep) => ({
          id: ep.participante.id,
          nombre: ep.participante.nombre,
          rol: ep.rol,
          imagenUrl:
            ((ep.participante.metadata as { crest?: string } | null)?.crest ??
              null),
        })),
      },
    }));

    // Marcador personal (doc 14): agregado en memoria sobre las mismas filas.
    const contar = (estado: string) =>
      predicciones.filter((p) => p.estado === estado).length;
    const acertadas = contar('ACERTADA');
    const falladas = contar('FALLADA');
    const resueltas = acertadas + falladas;
    return {
      resumen: {
        total: predicciones.length,
        pendientes: contar('PENDIENTE'),
        acertadas,
        falladas,
        anuladas: contar('ANULADA'),
        ticketsGanados: predicciones.reduce(
          (suma, p) => suma + (p.recompensaTickets ?? 0),
          0,
        ),
        precision:
          resueltas > 0 ? Math.round((acertadas / resueltas) * 100) : 0,
      },
      predicciones,
    };
  }

  /**
   * Crea un pronóstico en la modalidad indicada — GRATIS.
   *
   * ECONOMÍA v2 (doc 09, decisión de negocio 2026-07-03): los usuarios NUNCA
   * pierden Tickets por pronosticar; solo GANAN (recompensa por acierto, la
   * pagará el oráculo vía Ledger). El único cobro del sistema será la
   * inscripción a TORNEOS con premio físico (módulo Pollas, fase futura) —
   * ahí sí volverá a usarse LedgerService desde este Bounded Context.
   *
   * Idempotente por la unique (usuarioId, eventoId, tipo): repetir devuelve
   * el pronóstico original con `yaExistia: true`.
   *
   * @throws DomainException (MODALIDAD_NO_SOPORTADA) si el tipo no está en el catálogo.
   * @throws RecursoNoEncontradoException si el evento no existe.
   * @throws DomainException (EVENTO_NO_APOSTABLE, 409) si el evento ya comenzó.
   */
  async crearPrediccion(
    // Identidad del access token (@CurrentUser del controller) — el cliente
    // ya no puede pronosticar "a nombre de" otro usuario.
    usuarioId: string,
    dto: CrearPrediccionDto,
  ): Promise<PrediccionResponse> {
    // 1. La modalidad debe pertenecer al catálogo vigente del dominio.
    if (!esModalidadSoportada(dto.tipo)) {
      throw new DomainException(
        `Modalidad "${dto.tipo}" no soportada. Catálogo: ${MODALIDADES_SOPORTADAS.join(', ')}`,
        'MODALIDAD_NO_SOPORTADA',
      );
    }

    // 2. El evento debe existir y aceptar pronósticos.
    const evento = await this.prisma.evento.findUnique({
      where: { id: dto.eventoId },
      select: { id: true, nombre: true, estado: true },
    });
    if (!evento) {
      throw new RecursoNoEncontradoException('Evento', dto.eventoId);
    }
    if (evento.estado !== EstadoEvento.PROGRAMADO) {
      throw new DomainException(
        `El evento "${evento.nombre}" está ${evento.estado} y no acepta pronósticos`,
        'EVENTO_NO_APOSTABLE',
        409,
      );
    }

    // 3. Idempotencia: si ya existe la combinación usuario+evento+modalidad,
    //    devolver el original sin efectos (no hay cobro que repetir).
    const llave = {
      usuarioId_eventoId_tipo: {
        usuarioId,
        eventoId: dto.eventoId,
        tipo: dto.tipo,
      },
    };
    const existente = await this.prisma.prediccion.findUnique({
      where: llave,
    });
    if (existente) {
      this.logger.log(
        `Pronóstico ${dto.tipo} ya existente (usuario ${usuarioId}, evento ${dto.eventoId})`,
      );
      return this.aResponse(existente, true);
    }

    // 4. Persistir. Ante una carrera (dos requests simultáneos), la unique
    //    de la BD gana: P2002 se traduce al mismo camino idempotente.
    try {
      const prediccion = await this.prisma.prediccion.create({
        data: {
          usuarioId,
          eventoId: dto.eventoId,
          tipo: dto.tipo,
          payload: dto.payload as Prisma.InputJsonValue,
          costoTickets: 0, // pronosticar es gratis (economía v2)
        },
      });
      this.logger.log(`Pronóstico ${prediccion.id} creado [${dto.tipo}]`);
      return this.aResponse(prediccion, false);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const ganadora = await this.prisma.prediccion.findUniqueOrThrow({
          where: llave,
        });
        return this.aResponse(ganadora, true);
      }
      throw e;
    }
  }

  private aResponse(
    p: {
      id: string;
      eventoId: string;
      usuarioId: string;
      tipo: string;
      estado: string;
    },
    yaExistia: boolean,
  ): PrediccionResponse {
    return {
      prediccionId: p.id,
      eventoId: p.eventoId,
      usuarioId: p.usuarioId,
      tipo: p.tipo,
      estado: p.estado,
      yaExistia,
    };
  }
}
