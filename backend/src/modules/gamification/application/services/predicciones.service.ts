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
import { LedgerService } from '../../../ledger/application/services/ledger.service';
import {
  MODALIDADES_SOPORTADAS,
  esModalidadSoportada,
} from '../../domain/modalidades';
import {
  CrearPrediccionDto,
  PrediccionResponse,
} from '../dto/crear-prediccion.dto';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PrediccionesService {
  private readonly logger = new Logger(PrediccionesService.name);

  constructor(
    // Fachada del Bounded Context Economía — la ÚNICA forma permitida
    // de mover tickets desde este módulo.
    private readonly ledgerService: LedgerService,
    // TODO(SportsModule): cuando exista la fachada EventosService, la
    // consulta de solo-lectura al Evento debe pasar por ella en lugar de
    // tocar Prisma directamente (excepción pragmática y documentada).
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Crea un pronóstico en la modalidad indicada, cobrando su inscripción.
   *
   * @throws DomainException (MODALIDAD_NO_SOPORTADA) si el tipo no está en el catálogo.
   * @throws RecursoNoEncontradoException si el evento no existe.
   * @throws DomainException (EVENTO_NO_APOSTABLE, 409) si el evento ya comenzó.
   * @throws DomainException (SALDO_INSUFICIENTE, 409) si faltan tickets.
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

    // 3. Cobro vía doble entrada, idempotente por usuario+evento+modalidad.
    const prediccionId = randomUUID();
    const idempotencyKey = `PRONOSTICO:${usuarioId}:${dto.eventoId}:${dto.tipo}`;

    const tx = await this.ledgerService.registrarTransaccion({
      modulo: 'PRONOSTICOS',
      motivo: 'PAGO',
      descripcion: `Pronóstico ${dto.tipo} — ${evento.nombre}`,
      referencia: { tipo: 'PRONOSTICO', id: prediccionId },
      idempotencyKey,
      asientos: [
        {
          cuenta: { tipo: 'USUARIO', usuarioId: usuarioId },
          direccion: 'DEBITO',
          cantidad: dto.costoTickets,
        },
        {
          cuenta: { tipo: 'SISTEMA', codigo: 'REDENCION' },
          direccion: 'CREDITO',
          cantidad: dto.costoTickets,
        },
      ],
    });

    // Si el ledger devolvió una transacción PREVIA (reintento idempotente),
    // el id real de la predicción es el que viajó en ESA transacción.
    const idReal = tx.referenciaId ?? prediccionId;
    const yaExistia = tx.referenciaId !== prediccionId;

    // 4. Persistir la predicción. Upsert por la unique compuesta:
    //    - reintento normal => la fila ya existe, no se toca (update: {})
    //    - crash entre cobro y persistencia => esta llamada la "repara".
    const prediccion = await this.prisma.prediccion.upsert({
      where: {
        usuarioId_eventoId_tipo: {
          usuarioId: usuarioId,
          eventoId: dto.eventoId,
          tipo: dto.tipo,
        },
      },
      update: {},
      create: {
        id: idReal,
        usuarioId: usuarioId,
        eventoId: dto.eventoId,
        tipo: dto.tipo,
        payload: dto.payload as Prisma.InputJsonValue,
        costoTickets: dto.costoTickets,
      },
    });

    if (yaExistia) {
      this.logger.log(
        `Pronóstico ${dto.tipo} ya existente (usuario ${usuarioId}, evento ${dto.eventoId})`,
      );
    } else {
      this.logger.log(
        `Pronóstico ${prediccion.id} creado [${dto.tipo}] — tx ledger ${tx.id}`,
      );
    }

    return {
      prediccionId: prediccion.id,
      ledgerTransactionId: tx.id,
      eventoId: dto.eventoId,
      usuarioId: usuarioId,
      tipo: prediccion.tipo,
      costoTickets: prediccion.costoTickets,
      estado: prediccion.estado,
      yaExistia,
    };
  }
}
