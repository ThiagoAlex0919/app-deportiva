/**
 * BilleteraService — casos de uso de LECTURA del ledger (cara al usuario).
 *
 * Separado de LedgerService a propósito (CQRS ligero): la escritura tiene
 * un único consumidor interno (otros módulos); la lectura alimenta la UI
 * de Billetera (04_sitemap_y_ux.md).
 *
 * PENDIENTE (registrado en doc 05): cachear el saldo en Redis e invalidarlo
 * al registrar transacciones. En este slice el saldo se deriva en vivo,
 * apoyado por el índice (cuentaId, createdAt) del schema.
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  LEDGER_REPOSITORY,
  LedgerRepository,
} from '../../domain/repositories/ledger.repository';
import {
  HistorialResponse,
  SaldoResponse,
} from '../dto/billetera.dto';

@Injectable()
export class BilleteraService {
  constructor(
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepository: LedgerRepository,
  ) {}

  /**
   * Saldo actual del usuario, SIEMPRE derivado del ledger:
   * SUM(CREDITO) - SUM(DEBITO). Un usuario sin cuenta tiene saldo 0
   * (la cuenta se crea perezosamente con su primer movimiento).
   */
  async obtenerSaldo(usuarioId: string): Promise<SaldoResponse> {
    const saldo = await this.ledgerRepository.calcularSaldoUsuario(usuarioId);
    return {
      usuarioId,
      saldo,
      calculadoEn: new Date().toISOString(),
    };
  }

  /**
   * Historial de movimientos (más reciente primero) con paginación por
   * cursor — estable ante inserciones concurrentes, a diferencia de offset.
   */
  async obtenerHistorial(
    usuarioId: string,
    opciones: { cursor?: string; limit: number },
  ): Promise<HistorialResponse> {
    const { movimientos, nextCursor } =
      await this.ledgerRepository.obtenerHistorialUsuario(usuarioId, opciones);

    return {
      usuarioId,
      movimientos: movimientos.map((m) => ({
        asientoId: m.asientoId,
        fecha: m.fecha.toISOString(),
        direccion: m.direccion,
        cantidad: m.cantidad,
        modulo: m.modulo,
        motivo: m.motivo,
        descripcion: m.descripcion,
        transaccionId: m.transaccionId,
      })),
      nextCursor,
    };
  }
}
