/**
 * Módulo raíz del Monolito Modular.
 *
 * Cada import de `modules/` es un Bounded Context (ver 06_arquitectura_nestjs.md).
 * Regla: los módulos solo se comunican por sus fachadas exportadas o por
 * eventos de dominio — nunca importando internos de otro módulo.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { GamificationModule } from './modules/gamification/gamification.module';

@Module({
  imports: [
    // Infraestructura compartida (global): conexión a PostgreSQL vía Prisma.
    PrismaModule,
    // Bounded Contexts activos en este Vertical Slice.
    LedgerModule,
    GamificationModule,
    // Próximos (Fase 2 continúa): UsersModule (auth JWT), SportsModule.
  ],
})
export class AppModule {}
