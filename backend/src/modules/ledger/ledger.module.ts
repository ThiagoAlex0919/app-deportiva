/**
 * LedgerModule — Bounded Context "Economía Digital".
 *
 * Exporta ÚNICAMENTE LedgerService: esa es la fachada que otros módulos
 * (Gamificación, Marketplace, Reservas...) pueden inyectar para mover
 * tickets. El repositorio, la entidad y BilleteraService son internos.
 *
 * Regla DDD del schema: este módulo no importa ningún otro módulo de
 * dominio — no sabe qué es un pronóstico ni un pedido; solo recibe
 * referencias polimórficas (tipo + id).
 */
import { Module } from '@nestjs/common';
import { LEDGER_REPOSITORY } from './domain/repositories/ledger.repository';
import { LedgerService } from './application/services/ledger.service';
import { BilleteraService } from './application/services/billetera.service';
import { LedgerPrismaRepository } from './infrastructure/repositories/ledger.prisma.repository';
import { LedgerController } from './presentation/controllers/ledger.controller';

@Module({
  controllers: [LedgerController],
  providers: [
    LedgerService,
    BilleteraService,
    // Binding puerto -> adaptador (inversión de dependencias):
    // quien pida LEDGER_REPOSITORY recibe la implementación Prisma.
    { provide: LEDGER_REPOSITORY, useClass: LedgerPrismaRepository },
  ],
  exports: [LedgerService],
})
export class LedgerModule {}
