/**
 * Contrato INTERNO del método LedgerService.registrarTransaccion()
 * (el "contrato pendiente" registrado en 05_estado_del_proyecto.md, §2).
 *
 * No es un DTO HTTP: el ledger no expone escritura por API pública.
 * Lo consumen los demás módulos del monolito (Gamificación, Marketplace...)
 * inyectando LedgerService — único punto de escritura de la economía.
 */
import {
  AsientoNuevo,
  Modulo,
  Motivo,
} from '../../domain/entities/ledger-transaction.entity';

export interface RegistrarTransaccionInput {
  /** Módulo emisor (bounded context que origina la operación). */
  modulo: Modulo;
  /** Motivo de negocio normalizado. */
  motivo: Motivo;
  /** Descripción libre, visible en el historial de la billetera. */
  descripcion?: string;
  /** Referencia polimórfica al agregado de origen (ej. tipo=PRONOSTICO). */
  referencia?: { tipo: string; id: string };
  /**
   * Clave de idempotencia PROVISTA POR EL EMISOR. Un reintento con la misma
   * clave devuelve la transacción original sin duplicar tickets.
   */
  idempotencyKey: string;
  /** Asientos de la doble entrada (>= 2, deben cuadrar a cero). */
  asientos: AsientoNuevo[];
}
