/**
 * OraculoService — resuelve las predicciones de un evento FINALIZADO y
 * paga recompensas a los aciertos (doc 10, economía v2 del doc 09).
 *
 * Garantías:
 *  - Máquina de estados unidireccional: solo transiciona predicciones
 *    PENDIENTE (updateMany con guardia de estado — una carrera de dos
 *    oráculos simultáneos no resuelve dos veces).
 *  - Pago idempotente: idempotencyKey = RECOMPENSA:{prediccionId} en el
 *    Ledger — re-ejecutar el oráculo JAMÁS paga doble.
 *  - Eventos POSPUESTO/CANCELADO → predicciones ANULADA (sin reverso:
 *    en la economía v2 pronosticar no costó nada).
 */
import { Injectable, Logger } from '@nestjs/common';
import { EstadoEvento, EstadoPrediccion } from '@prisma/client';
import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { LedgerService } from '../../../ledger/application/services/ledger.service';
import { esModalidadSoportada } from '../../domain/modalidades';
import { recompensaPorModalidad } from '../../domain/recompensas';
import { RESOLUTORES, ContextoResolucion } from '../../domain/resolutores';

export interface ResumenResolucion {
  eventoId: string;
  evaluadas: number;
  acertadas: number;
  falladas: number;
  anuladas: number;
  ticketsPagados: number;
}

@Injectable()
export class OraculoService {
  private readonly logger = new Logger(OraculoService.name);

  constructor(
    private readonly prisma: PrismaService,
    // Fachada del Bounded Context Economía: única vía para pagar recompensas.
    private readonly ledgerService: LedgerService,
  ) {}

  /** Resuelve todas las predicciones PENDIENTES del evento. */
  async resolverEvento(eventoId: string): Promise<ResumenResolucion> {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      include: { participantes: true },
    });
    if (!evento) {
      throw new DomainException(
        `Evento "${eventoId}" no existe`,
        'RECURSO_NO_ENCONTRADO',
        404,
      );
    }

    // Eventos muertos: anular pronósticos (sin dinero de por medio).
    if (
      evento.estado === EstadoEvento.POSPUESTO ||
      evento.estado === EstadoEvento.CANCELADO
    ) {
      const anuladas = await this.prisma.prediccion.updateMany({
        where: { eventoId, estado: EstadoPrediccion.PENDIENTE },
        data: { estado: EstadoPrediccion.ANULADA },
      });
      return {
        eventoId,
        evaluadas: anuladas.count,
        acertadas: 0,
        falladas: 0,
        anuladas: anuladas.count,
        ticketsPagados: 0,
      };
    }

    if (evento.estado !== EstadoEvento.FINALIZADO) {
      throw new DomainException(
        `El evento "${evento.nombre}" está ${evento.estado}; el oráculo solo resuelve eventos FINALIZADOS`,
        'EVENTO_NO_RESUELTO',
        409,
      );
    }

    const contexto: ContextoResolucion = {
      resultado: (evento.resultado ?? {}) as Record<string, unknown>,
      posiciones: new Map(
        evento.participantes
          .filter((p) => p.posicionFinal !== null)
          .map((p) => [p.participanteId, p.posicionFinal as number]),
      ),
    };

    const pendientes = await this.prisma.prediccion.findMany({
      where: { eventoId, estado: EstadoPrediccion.PENDIENTE },
    });

    let acertadas = 0;
    let falladas = 0;
    let ticketsPagados = 0;

    for (const prediccion of pendientes) {
      const acierta =
        esModalidadSoportada(prediccion.tipo) &&
        RESOLUTORES[prediccion.tipo](
          prediccion.payload as Record<string, unknown>,
          contexto,
        );

      // Transición con guardia: si otro proceso ya la resolvió, count = 0
      // y NO se paga (el pago va después y es idempotente de todas formas).
      const transicion = await this.prisma.prediccion.updateMany({
        where: { id: prediccion.id, estado: EstadoPrediccion.PENDIENTE },
        data: {
          estado: acierta
            ? EstadoPrediccion.ACERTADA
            : EstadoPrediccion.FALLADA,
        },
      });
      if (transicion.count === 0) continue;

      if (acierta && esModalidadSoportada(prediccion.tipo)) {
        const recompensa = recompensaPorModalidad(prediccion.tipo);
        await this.ledgerService.registrarTransaccion({
          modulo: 'PRONOSTICOS',
          motivo: 'RECOMPENSA',
          descripcion: `¡Acertaste! ${prediccion.tipo} — ${evento.nombre}`,
          referencia: { tipo: 'PRONOSTICO', id: prediccion.id },
          idempotencyKey: `RECOMPENSA:${prediccion.id}`,
          asientos: [
            {
              cuenta: { tipo: 'SISTEMA', codigo: 'TESORERIA' },
              direccion: 'DEBITO',
              cantidad: recompensa,
            },
            {
              cuenta: { tipo: 'USUARIO', usuarioId: prediccion.usuarioId },
              direccion: 'CREDITO',
              cantidad: recompensa,
            },
          ],
        });
        acertadas += 1;
        ticketsPagados += recompensa;
      } else {
        falladas += 1;
      }
    }

    this.logger.log(
      `Oráculo: evento ${eventoId} → ${acertadas} acertadas (+${ticketsPagados} 🎟), ${falladas} falladas`,
    );
    return {
      eventoId,
      evaluadas: pendientes.length,
      acertadas,
      falladas,
      anuladas: 0,
      ticketsPagados,
    };
  }
}
