/**
 * AdminEventosService — cierre de eventos (backoffice, doc 10).
 *
 * Guarda resultado + posiciones, marca FINALIZADO y delega en el Oráculo
 * (fachada exportada por GamificationModule) la resolución y el pago.
 */
import { Injectable, Logger } from '@nestjs/common';
import { EstadoEvento, Prisma } from '@prisma/client';
import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { RecursoNoEncontradoException } from '../../../../shared/domain/exceptions/domain.exception';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { OraculoService } from '../../../gamification/application/services/oraculo.service';
import {
  FinalizarEventoDto,
  FinalizarEventoResponse,
} from '../dto/finalizar-evento.dto';

@Injectable()
export class AdminEventosService {
  private readonly logger = new Logger(AdminEventosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oraculoService: OraculoService,
  ) {}

  async finalizarEvento(
    eventoId: string,
    dto: FinalizarEventoDto,
  ): Promise<FinalizarEventoResponse> {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: { id: true, nombre: true, estado: true },
    });
    if (!evento) throw new RecursoNoEncontradoException('Evento', eventoId);

    // Reintento idempotente: si ya está FINALIZADO, no se reescribe el
    // resultado (inmutabilidad del historial) pero SÍ se re-invoca el
    // oráculo — es inocuo (solo toca predicciones PENDIENTES).
    if (
      evento.estado !== EstadoEvento.FINALIZADO &&
      evento.estado !== EstadoEvento.PROGRAMADO &&
      evento.estado !== EstadoEvento.EN_VIVO
    ) {
      throw new DomainException(
        `El evento "${evento.nombre}" está ${evento.estado} y no puede finalizarse`,
        'EVENTO_NO_FINALIZABLE',
        409,
      );
    }

    if (evento.estado !== EstadoEvento.FINALIZADO) {
      // Transacción: resultado global + posiciones + estado, todo o nada.
      await this.prisma.$transaction(async (tx) => {
        await tx.evento.update({
          where: { id: eventoId },
          data: {
            estado: EstadoEvento.FINALIZADO,
            resultado: dto.resultado as Prisma.InputJsonValue,
          },
        });
        for (const p of dto.posiciones ?? []) {
          await tx.eventoParticipante.updateMany({
            where: { eventoId, participanteId: p.participanteId },
            data: { posicionFinal: p.posicionFinal },
          });
        }
      });
      this.logger.log(`Evento ${eventoId} FINALIZADO por admin`);
    }

    const oraculo = await this.oraculoService.resolverEvento(eventoId);
    return { eventoId, estado: EstadoEvento.FINALIZADO, oraculo };
  }
}
