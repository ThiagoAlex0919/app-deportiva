/**
 * LedgerService — ÚNICO PUNTO DE ESCRITURA de la economía de Tickets.
 *
 * Regla de oro del contexto Economía (06_arquitectura_nestjs.md, §4):
 * ningún módulo escribe en las tablas ledger_* directamente; todos pasan
 * por registrarTransaccion(), que garantiza:
 *   1. Invariantes de dominio (doble entrada, cuadre a cero, cantidades > 0)
 *      — validadas por LedgerTransactionEntity ANTES de tocar la base.
 *   2. Idempotencia: reintentos con la misma clave devuelven la transacción
 *      original (respaldado por el @unique de idempotencyKey en la BD).
 *   3. Atomicidad y saldo no-negativo: delegadas al repositorio, que ejecuta
 *      todo en una transacción serializable de PostgreSQL.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { LedgerTransactionEntity } from '../../domain/entities/ledger-transaction.entity';
import {
  LEDGER_REPOSITORY,
  LedgerRepository,
  TransaccionRegistrada,
} from '../../domain/repositories/ledger.repository';
import { RegistrarTransaccionInput } from '../dto/registrar-transaccion.input';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    // Se inyecta el PUERTO, no la implementación: el servicio es testeable
    // con un repositorio en memoria y no sabe que Prisma existe.
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepository: LedgerRepository,
  ) {}

  /**
   * Registra una operación económica como transacción de doble entrada.
   *
   * @returns La transacción persistida — o la ORIGINAL si la idempotencyKey
   *          ya había sido procesada (comportamiento idempotente, no error).
   * @throws  DomainException si se viola una invariante o el saldo es insuficiente.
   */
  async registrarTransaccion(
    input: RegistrarTransaccionInput,
  ): Promise<TransaccionRegistrada> {
    // 1. Construir el agregado: si algo es inválido, explota AQUÍ,
    //    antes de abrir cualquier transacción de base de datos.
    const transaccion = LedgerTransactionEntity.crear({
      modulo: input.modulo,
      motivo: input.motivo,
      descripcion: input.descripcion,
      referencia: input.referencia,
      idempotencyKey: input.idempotencyKey,
      asientos: input.asientos,
    });

    // 2. Camino rápido de idempotencia: si la clave ya existe, devolver
    //    la transacción original sin efectos secundarios.
    const existente = await this.ledgerRepository.buscarPorIdempotencyKey(
      input.idempotencyKey,
    );
    if (existente) {
      this.logger.log(
        `Idempotencia: clave "${input.idempotencyKey}" ya procesada (tx ${existente.id})`,
      );
      return existente;
    }

    // 3. Persistencia atómica (el repositorio revalida saldo e idempotencia
    //    dentro de la transacción serializable — el paso 2 es solo un atajo).
    const registrada = await this.ledgerRepository.registrar(transaccion);
    this.logger.log(
      `Tx ${registrada.id} registrada [${input.modulo}/${input.motivo}] ` +
        `(${input.asientos.length} asientos)`,
    );
    return registrada;
  }
}
