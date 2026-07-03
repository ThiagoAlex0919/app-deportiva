/**
 * LedgerTransactionEntity — agregado del contexto Economía.
 *
 * Encapsula las INVARIANTES del ledger de doble entrada que Prisma no puede
 * expresar (ver comentarios del schema.prisma aprobado):
 *   1. Toda transacción tiene >= 2 asientos.
 *   2. SUM(DEBITO) === SUM(CREDITO)  (la transacción "cuadra a cero").
 *   3. Toda cantidad es un entero > 0 (el signo lo da la dirección).
 *   4. idempotencyKey obligatoria (la provee el módulo emisor).
 *
 * NOTA DDD: este archivo NO importa nada de NestJS ni de Prisma. Los tipos
 * de dirección/módulo/motivo se declaran como literales de string que el
 * repositorio de infraestructura mapea a los enums de @prisma/client.
 */
import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';

/** Dirección contable de un asiento (espejo del enum DireccionAsiento del schema). */
export type Direccion = 'DEBITO' | 'CREDITO';

/** Módulos autorizados a escribir en el ledger (espejo del enum ModuloSistema). */
export type Modulo =
  | 'GAMIFICACION'
  | 'PRONOSTICOS'
  | 'MARKETPLACE'
  | 'RESERVAS'
  | 'CONTENIDO'
  | 'USUARIOS'
  | 'ADMIN';

/** Motivos de negocio normalizados (espejo del enum MotivoTransaccion). */
export type Motivo =
  | 'RECOMPENSA'
  | 'BONO'
  | 'PAGO'
  | 'DESCUENTO'
  | 'REDENCION'
  | 'TRANSFERENCIA'
  | 'AJUSTE'
  | 'REVERSO'
  | 'EXPIRACION';

/**
 * Referencia a una cuenta SIN exponer ids internos del ledger:
 *  - USUARIO: la billetera del usuario (se resuelve/crea por usuarioId).
 *  - SISTEMA: cuenta de contrapartida identificada por código ("TESORERIA"...).
 */
export type CuentaRef =
  | { tipo: 'USUARIO'; usuarioId: string }
  | { tipo: 'SISTEMA'; codigo: 'TESORERIA' | 'REDENCION' | 'PROMOCIONES' };

/** Asiento aún no persistido, expresado en términos del dominio. */
export interface AsientoNuevo {
  cuenta: CuentaRef;
  direccion: Direccion;
  cantidad: number;
}

export interface LedgerTransactionProps {
  modulo: Modulo;
  motivo: Motivo;
  descripcion?: string;
  /** Referencia polimórfica al agregado de origen (sin FK, por diseño). */
  referencia?: { tipo: string; id: string };
  idempotencyKey: string;
  asientos: AsientoNuevo[];
}

export class LedgerTransactionEntity {
  private constructor(public readonly props: LedgerTransactionProps) {}

  /**
   * Único constructor público (patrón factory). Lanza DomainException si
   * cualquier invariante se viola — una transacción inválida jamás existe
   * como objeto en memoria, mucho menos en la base.
   */
  static crear(props: LedgerTransactionProps): LedgerTransactionEntity {
    // Invariante 4: idempotencia obligatoria.
    if (!props.idempotencyKey || props.idempotencyKey.trim().length === 0) {
      throw new DomainException(
        'Toda transacción del ledger requiere una idempotencyKey',
        'IDEMPOTENCY_KEY_REQUERIDA',
      );
    }

    // Invariante 1: doble entrada real (mínimo un débito y un crédito).
    if (!props.asientos || props.asientos.length < 2) {
      throw new DomainException(
        'Una transacción del ledger requiere al menos 2 asientos',
        'ASIENTOS_INSUFICIENTES',
      );
    }

    // Invariante 3: cantidades enteras y positivas.
    for (const asiento of props.asientos) {
      if (!Number.isInteger(asiento.cantidad) || asiento.cantidad <= 0) {
        throw new DomainException(
          `Cantidad inválida (${asiento.cantidad}): los Tickets son enteros > 0`,
          'CANTIDAD_INVALIDA',
        );
      }
    }

    // Invariante 2: la transacción cuadra a cero.
    const totalDebito = LedgerTransactionEntity.sumar(props.asientos, 'DEBITO');
    const totalCredito = LedgerTransactionEntity.sumar(props.asientos, 'CREDITO');
    if (totalDebito !== totalCredito) {
      throw new DomainException(
        `La transacción no cuadra: débitos=${totalDebito}, créditos=${totalCredito}`,
        'TRANSACCION_DESBALANCEADA',
      );
    }

    return new LedgerTransactionEntity(props);
  }

  /**
   * Efecto NETO de esta transacción sobre cada cuenta de USUARIO:
   * (débitos - créditos) por usuarioId. Un neto > 0 significa que la cuenta
   * pierde tickets y por tanto requiere verificación de saldo suficiente.
   * Lo consume el repositorio dentro de su transacción serializable.
   */
  netoDebitadoPorUsuario(): Map<string, number> {
    const neto = new Map<string, number>();
    for (const asiento of this.props.asientos) {
      if (asiento.cuenta.tipo !== 'USUARIO') continue;
      const actual = neto.get(asiento.cuenta.usuarioId) ?? 0;
      const delta =
        asiento.direccion === 'DEBITO' ? asiento.cantidad : -asiento.cantidad;
      neto.set(asiento.cuenta.usuarioId, actual + delta);
    }
    return neto;
  }

  private static sumar(asientos: AsientoNuevo[], direccion: Direccion): number {
    return asientos
      .filter((a) => a.direccion === direccion)
      .reduce((suma, a) => suma + a.cantidad, 0);
  }
}
