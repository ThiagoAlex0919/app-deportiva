/**
 * Módulo raíz del Monolito Modular.
 *
 * Cada import de `modules/` es un Bounded Context (ver 06_arquitectura_nestjs.md).
 * Regla: los módulos solo se comunican por sus fachadas exportadas o por
 * eventos de dominio — nunca importando internos de otro módulo.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { JwtAuthGuard } from './shared/presentation/guards/jwt-auth.guard';
import { LedgerModule } from './modules/ledger/ledger.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { UsersModule } from './modules/users/users.module';
import { SportsModule } from './modules/sports/sports.module';
import { ContentModule } from './modules/content/content.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';

@Module({
  imports: [
    // Infraestructura compartida (global): conexión a PostgreSQL vía Prisma.
    PrismaModule,
    // Bounded Contexts activos.
    UsersModule, // identidad: registra el JwtModule global que usa el guard
    LedgerModule,
    GamificationModule,
    SportsModule, // catálogo público de deportes/eventos (doc 08)
    ContentModule, // noticias agregadas por RSS (doc 11)
    MarketplaceModule, // tienda con descuentos por Tickets (doc 15)
  ],
  providers: [
    // Guard GLOBAL secure-by-default (07_modulo_users_jwt.md §2.3):
    // toda ruta exige access token salvo que se marque @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
