/**
 * Puerto (interface) de persistencia del contexto Economía.
 *
 * La capa de aplicación depende de ESTA interface; la implementación Prisma
 * vive en infrastructure/ y se inyecta con el token LEDGER_REPOSITORY
 * (inversión de dependencias — el dominio no conoce a Prisma).
 */
import { LedgerTransactionEntity } from '../entities/ledger-transaction.entity';

/** Token de inyección para NestJS (las interfaces no existen en runtime). */
export const LEDGER_REPOSITORY = Symbol('LEDGER_REPOSITORY');

/** Proyección de una transacción ya persistida (lo que ven los consumidores). */
export interface TransaccionRegistrada {
  id: string;
  fecha: Date;
  modulo: string;
  motivo: string;
  descripcion: string | null;
  referenciaTipo: string | null;
  referenciaId: string | null;
  idempotencyKey: string;
}

/** Un movimiento del historial de billetera (asiento + contexto de su transacción). */
export interface MovimientoBilletera {
  asientoId: string;
  fecha: Date;
  direccion: 'DEBITO' | 'CREDITO';
  cantidad: number;
  modulo: string;
  motivo: string;
  descripcion: string | null;
  transaccionId: string;
}

export interface HistorialPaginado {
  movimientos: MovimientoBilletera[];
  /** Cursor para pedir la página siguiente; null si no hay más. */
  nextCursor: string | null;
}

export interface LedgerRepository {
  /** Devuelve la transacción existente para una idempotencyKey, o null. */
  buscarPorIdempotencyKey(
    idempotencyKey: string,
  ): Promise<TransaccionRegistrada | null>;

  /**
   * Persiste la transacción de forma ATÓMICA (transacción serializable):
   * resuelve/crea cuentas, verifica saldo suficiente en cuentas de USUARIO
   * y escribe cabecera + asientos. Lanza DomainException si el saldo es
   * insuficiente o algún usuario no existe.
   */
  registrar(
    transaccion: LedgerTransactionEntity,
  ): Promise<TransaccionRegistrada>;

  /** Saldo derivado de un usuario: SUM(CREDITO) - SUM(DEBITO). 0 si no tiene cuenta. */
  calcularSaldoUsuario(usuarioId: string): Promise<number>;

  /** Historial de movimientos del usuario, más reciente primero, paginado por cursor. */
  obtenerHistorialUsuario(
    usuarioId: string,
    opciones: { cursor?: string; limit: number },
  ): Promise<HistorialPaginado>;
}
