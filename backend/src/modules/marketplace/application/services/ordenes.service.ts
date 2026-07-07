/**
 * OrdenesService — checkout y ciclo de vida de pedidos (doc 15).
 *
 * Economía (doc 09): los Tickets aquí son DESCUENTO sobre el precio en
 * dinero — el "sumidero" usuarios → REDENCION previsto desde el doc 02.
 *  - Cobro: LedgerService, MARKETPLACE/DESCUENTO, idempotencyKey
 *    `DESCUENTO:{ordenId}` — reintentar el checkout jamás cobra doble.
 *  - Cancelación: REVERSO automático de los tickets (REDENCION → usuario),
 *    idempotente por `REVERSO:DESCUENTO:{ordenId}`.
 *
 * v1 sin pasarela: la orden nace PENDIENTE_PAGO y el backoffice la avanza
 * (PAGADA → ENVIADA → ENTREGADA). La pasarela (v2) se enchufa aquí mismo.
 */
import { Injectable, Logger } from '@nestjs/common';
import { EstadoOrden } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { RecursoNoEncontradoException } from '../../../../shared/domain/exceptions/domain.exception';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { LedgerService } from '../../../ledger/application/services/ledger.service';
import { CatalogoService } from './catalogo.service';
import { CrearOrdenDto, OrdenResponse } from '../dto/marketplace.dto';

@Injectable()
export class OrdenesService {
  private readonly logger = new Logger(OrdenesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogoService: CatalogoService,
    // Fachada del Bounded Context Economía — única vía para mover Tickets.
    private readonly ledgerService: LedgerService,
  ) {}

  async crear(usuarioId: string, dto: CrearOrdenDto): Promise<OrdenResponse> {
    const producto = this.catalogoService.obtener(dto.productoSlug);
    const reglas = this.catalogoService.reglas();

    // Descuento: tickets × valor, con tope de % del precio (regla de negocio).
    const descuentoSolicitado = dto.ticketsAUsar * reglas.valorTicketCop;
    const topeCop = Math.floor(
      (producto.precioCop * reglas.maxDescuentoPorcentaje) / 100,
    );
    if (descuentoSolicitado > topeCop) {
      const maxTickets = Math.floor(topeCop / reglas.valorTicketCop);
      throw new DomainException(
        `El descuento máximo para este producto es ${reglas.maxDescuentoPorcentaje}% (${maxTickets} Tickets)`,
        'DESCUENTO_EXCEDE_TOPE',
        422,
      );
    }

    const ordenId = randomUUID();
    let ledgerTransactionId: string | null = null;

    // Cobro de tickets ANTES de crear la orden: si el saldo no alcanza,
    // el Ledger lanza SALDO_INSUFICIENTE y no queda orden huérfana.
    // (Crash entre cobro y orden: el reintento con la misma ordenId no
    // existe — pero la idempotencyKey evita doble cobro y el backoffice
    // puede reversar; caso borde aceptado y documentado.)
    if (dto.ticketsAUsar > 0) {
      const tx = await this.ledgerService.registrarTransaccion({
        modulo: 'MARKETPLACE',
        motivo: 'DESCUENTO',
        descripcion: `Descuento en ${producto.nombre}`,
        referencia: { tipo: 'ORDEN', id: ordenId },
        idempotencyKey: `DESCUENTO:${ordenId}`,
        asientos: [
          {
            cuenta: { tipo: 'USUARIO', usuarioId },
            direccion: 'DEBITO',
            cantidad: dto.ticketsAUsar,
          },
          {
            cuenta: { tipo: 'SISTEMA', codigo: 'REDENCION' },
            direccion: 'CREDITO',
            cantidad: dto.ticketsAUsar,
          },
        ],
      });
      ledgerTransactionId = tx.id;
    }

    const orden = await this.prisma.orden.create({
      data: {
        id: ordenId,
        usuarioId,
        productoSlug: producto.slug,
        productoNombre: producto.nombre,
        precioCop: producto.precioCop,
        ticketsUsados: dto.ticketsAUsar,
        descuentoCop: descuentoSolicitado,
        totalCop: producto.precioCop - descuentoSolicitado,
        direccion: dto.direccion.trim(),
        telefono: dto.telefono.trim(),
        ledgerTransactionId,
      },
    });
    this.logger.log(
      `Orden ${orden.id} creada: ${producto.slug} (−${dto.ticketsAUsar} 🎟 = −$${descuentoSolicitado})`,
    );
    return this.aResponse(orden);
  }

  async listarMias(usuarioId: string): Promise<{ ordenes: OrdenResponse[] }> {
    const filas = await this.prisma.orden.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ordenes: filas.map((o) => this.aResponse(o)) };
  }

  /** Backoffice: avanza el estado; CANCELADA reversa los tickets. */
  async cambiarEstado(
    ordenId: string,
    estado: EstadoOrden,
  ): Promise<OrdenResponse> {
    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
    });
    if (!orden) throw new RecursoNoEncontradoException('Orden', ordenId);

    if (orden.estado === EstadoOrden.CANCELADA) {
      throw new DomainException(
        'Una orden cancelada no puede cambiar de estado',
        'ORDEN_CANCELADA',
        409,
      );
    }

    if (estado === EstadoOrden.CANCELADA && orden.ticketsUsados > 0) {
      // Devolver los tickets: REDENCION → usuario (idempotente).
      await this.ledgerService.registrarTransaccion({
        modulo: 'MARKETPLACE',
        motivo: 'REVERSO',
        descripcion: `Reverso descuento — orden cancelada (${orden.productoNombre})`,
        referencia: { tipo: 'ORDEN', id: orden.id },
        idempotencyKey: `REVERSO:DESCUENTO:${orden.id}`,
        asientos: [
          {
            cuenta: { tipo: 'SISTEMA', codigo: 'REDENCION' },
            direccion: 'DEBITO',
            cantidad: orden.ticketsUsados,
          },
          {
            cuenta: { tipo: 'USUARIO', usuarioId: orden.usuarioId },
            direccion: 'CREDITO',
            cantidad: orden.ticketsUsados,
          },
        ],
      });
    }

    const actualizada = await this.prisma.orden.update({
      where: { id: orden.id },
      data: { estado },
    });
    this.logger.log(`Orden ${orden.id}: ${orden.estado} → ${estado}`);
    return this.aResponse(actualizada);
  }

  private aResponse(o: {
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
    createdAt: Date;
  }): OrdenResponse {
    return {
      id: o.id,
      productoSlug: o.productoSlug,
      productoNombre: o.productoNombre,
      precioCop: o.precioCop,
      ticketsUsados: o.ticketsUsados,
      descuentoCop: o.descuentoCop,
      totalCop: o.totalCop,
      estado: o.estado,
      direccion: o.direccion,
      telefono: o.telefono,
      createdAt: o.createdAt.toISOString(),
    };
  }
}
