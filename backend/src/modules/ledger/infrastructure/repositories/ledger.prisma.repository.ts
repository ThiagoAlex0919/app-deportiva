/**
 * LedgerPrismaRepository — adaptador de persistencia del contexto Economía.
 *
 * Implementa el puerto LedgerRepository contra PostgreSQL vía Prisma.
 * Es la ÚNICA clase del sistema que toca las tablas ledger_*.
 *
 * Garantías de concurrencia:
 *  - registrar() corre en una transacción SERIALIZABLE: la verificación de
 *    saldo y la inserción de asientos son un solo paso atómico; dos gastos
 *    simultáneos del mismo usuario no pueden dejar saldo negativo.
 *  - La carrera de idempotencia (dos reintentos simultáneos con la misma
 *    clave) la resuelve el @unique de la BD: el perdedor recibe P2002 y
 *    devolvemos la transacción del ganador.
 */
import { Injectable } from '@nestjs/common';
import {
  DireccionAsiento,
  ModuloSistema,
  MotivoTransaccion,
  Prisma,
  TipoLedgerAccount,
} from '@prisma/client';
import {
  DomainException,
  RecursoNoEncontradoException,
} from '../../../../shared/domain/exceptions/domain.exception';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  CuentaRef,
  LedgerTransactionEntity,
} from '../../domain/entities/ledger-transaction.entity';
import {
  HistorialPaginado,
  LedgerRepository,
  TransaccionRegistrada,
} from '../../domain/repositories/ledger.repository';

/** Mapa código de cuenta de sistema -> tipo contable (enum del schema). */
const TIPO_POR_CODIGO: Record<string, TipoLedgerAccount> = {
  TESORERIA: TipoLedgerAccount.TESORERIA,
  REDENCION: TipoLedgerAccount.REDENCION,
  PROMOCIONES: TipoLedgerAccount.PROMOCION,
};

@Injectable()
export class LedgerPrismaRepository implements LedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorIdempotencyKey(
    idempotencyKey: string,
  ): Promise<TransaccionRegistrada | null> {
    const tx = await this.prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey },
    });
    return tx ? this.aProyeccion(tx) : null;
  }

  async registrar(
    transaccion: LedgerTransactionEntity,
  ): Promise<TransaccionRegistrada> {
    const { props } = transaccion;
    try {
      const creada = await this.prisma.$transaction(
        async (tx) => {
          // 1. Resolver cada CuentaRef del dominio a un id físico de cuenta
          //    (creando la cuenta si no existe — creación perezosa).
          const idsPorClave = await this.resolverCuentas(tx, props.asientos.map((a) => a.cuenta));

          // 2. Verificar saldo suficiente para cada usuario debitado NETO.
          //    Dentro de la transacción serializable: ninguna otra escritura
          //    puede colarse entre esta lectura y el insert del paso 3.
          for (const [usuarioId, neto] of transaccion.netoDebitadoPorUsuario()) {
            if (neto <= 0) continue; // la cuenta recibe más de lo que entrega
            const cuentaId = idsPorClave.get(this.claveUsuario(usuarioId))!;
            const saldo = await this.saldoDeCuenta(tx, cuentaId);
            if (saldo < neto) {
              throw new DomainException(
                `Saldo insuficiente: se requieren ${neto} tickets y el usuario tiene ${saldo}`,
                'SALDO_INSUFICIENTE',
                409,
              );
            }
          }

          // 3. Insertar cabecera + asientos en un solo create anidado.
          return tx.ledgerTransaction.create({
            data: {
              modulo: props.modulo as ModuloSistema,
              motivo: props.motivo as MotivoTransaccion,
              descripcion: props.descripcion ?? null,
              referenciaTipo: props.referencia?.tipo ?? null,
              referenciaId: props.referencia?.id ?? null,
              idempotencyKey: props.idempotencyKey,
              asientos: {
                create: props.asientos.map((a) => ({
                  cuentaId: idsPorClave.get(this.claveDe(a.cuenta))!,
                  direccion: a.direccion as DireccionAsiento,
                  cantidad: a.cantidad,
                })),
              },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return this.aProyeccion(creada);
    } catch (error) {
      // Carrera de idempotencia: otro reintento ganó el insert.
      // Comportamiento correcto = devolver SU transacción, no fallar.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const original = await this.buscarPorIdempotencyKey(props.idempotencyKey);
        if (original) return original;
      }
      throw error;
    }
  }

  async calcularSaldoUsuario(usuarioId: string): Promise<number> {
    const cuenta = await this.prisma.ledgerAccount.findUnique({
      where: { usuarioId },
      select: { id: true },
    });
    // Sin cuenta => sin movimientos => saldo 0 (no es un error).
    if (!cuenta) return 0;
    return this.saldoDeCuenta(this.prisma, cuenta.id);
  }

  async obtenerHistorialUsuario(
    usuarioId: string,
    opciones: { cursor?: string; limit: number },
  ): Promise<HistorialPaginado> {
    const asientos = await this.prisma.ledgerEntry.findMany({
      where: { cuenta: { usuarioId } },
      include: { transaccion: true },
      // Aprovecha el índice @@index([cuentaId, createdAt]) del schema.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: opciones.limit + 1, // +1 para saber si hay página siguiente
      ...(opciones.cursor
        ? { cursor: { id: opciones.cursor }, skip: 1 } // skip 1: excluir el propio cursor
        : {}),
    });

    const hayMas = asientos.length > opciones.limit;
    const pagina = hayMas ? asientos.slice(0, opciones.limit) : asientos;

    return {
      movimientos: pagina.map((a) => ({
        asientoId: a.id,
        fecha: a.createdAt,
        direccion: a.direccion,
        cantidad: a.cantidad,
        modulo: a.transaccion.modulo,
        motivo: a.transaccion.motivo,
        descripcion: a.transaccion.descripcion,
        transaccionId: a.transaccionId,
      })),
      nextCursor: hayMas ? pagina[pagina.length - 1].id : null,
    };
  }

  // ------------------------------------------------------------------
  // Helpers privados
  // ------------------------------------------------------------------

  /**
   * Resuelve las CuentaRef a ids de ledger_accounts, creando las cuentas
   * que no existan:
   *  - USUARIO: valida que el usuario exista y hace upsert de su billetera.
   *  - SISTEMA: upsert por código (solo códigos del catálogo TIPO_POR_CODIGO).
   */
  private async resolverCuentas(
    tx: Prisma.TransactionClient,
    refs: CuentaRef[],
    ): Promise<Map<string, string>> {
    const ids = new Map<string, string>();

    for (const ref of refs) {
      const clave = this.claveDe(ref);
      if (ids.has(clave)) continue; // misma cuenta referida por varios asientos

      if (ref.tipo === 'USUARIO') {
        const usuario = await tx.usuario.findUnique({
          where: { id: ref.usuarioId },
          select: { id: true },
        });
        if (!usuario) {
          throw new RecursoNoEncontradoException('Usuario', ref.usuarioId);
        }
        const cuenta = await tx.ledgerAccount.upsert({
          where: { usuarioId: ref.usuarioId },
          update: {},
          create: {
            tipo: TipoLedgerAccount.USUARIO,
            usuarioId: ref.usuarioId,
          },
          select: { id: true },
        });
        ids.set(clave, cuenta.id);
      } else {
        const tipo = TIPO_POR_CODIGO[ref.codigo];
        if (!tipo) {
          throw new DomainException(
            `Código de cuenta de sistema desconocido: "${ref.codigo}"`,
            'CUENTA_SISTEMA_DESCONOCIDA',
          );
        }
        const cuenta = await tx.ledgerAccount.upsert({
          where: { codigo: ref.codigo },
          update: {},
          create: { tipo, codigo: ref.codigo },
          select: { id: true },
        });
        ids.set(clave, cuenta.id);
      }
    }
    return ids;
  }

  /** Saldo derivado de una cuenta: SUM(CREDITO) - SUM(DEBITO) de sus asientos. */
  private async saldoDeCuenta(
    client: Prisma.TransactionClient | PrismaService,
    cuentaId: string,
  ): Promise<number> {
    const grupos = await client.ledgerEntry.groupBy({
      by: ['direccion'],
      where: { cuentaId },
      _sum: { cantidad: true },
    });
    let saldo = 0;
    for (const g of grupos) {
      const suma = g._sum.cantidad ?? 0;
      saldo += g.direccion === DireccionAsiento.CREDITO ? suma : -suma;
    }
    return saldo;
  }

  /** Clave interna estable para deduplicar CuentaRef dentro de una transacción. */
  private claveDe(ref: CuentaRef): string {
    return ref.tipo === 'USUARIO'
      ? this.claveUsuario(ref.usuarioId)
      : `SISTEMA:${ref.codigo}`;
  }

  private claveUsuario(usuarioId: string): string {
    return `USUARIO:${usuarioId}`;
  }

  /** Mapper: fila Prisma -> proyección del dominio (sin exponer el modelo). */
  private aProyeccion(tx: {
    id: string;
    fecha: Date;
    modulo: string;
    motivo: string;
    descripcion: string | null;
    referenciaTipo: string | null;
    referenciaId: string | null;
    idempotencyKey: string;
  }): TransaccionRegistrada {
    return {
      id: tx.id,
      fecha: tx.fecha,
      modulo: tx.modulo,
      motivo: tx.motivo,
      descripcion: tx.descripcion,
      referenciaTipo: tx.referenciaTipo,
      referenciaId: tx.referenciaId,
      idempotencyKey: tx.idempotencyKey,
    };
  }
}
