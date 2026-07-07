/**
 * SportsModule — Bounded Context del catálogo deportivo (docs 08/10).
 *
 * Lectura pública (EventosController) + backoffice de cierre de eventos
 * (AdminEventosController → Oráculo). Importa GamificationModule SOLO por
 * su fachada exportada (OraculoService) — regla del monolito modular.
 */
import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { EventosService } from './application/services/eventos.service';
import { AdminEventosService } from './application/services/admin-eventos.service';
import { FixturesSyncService } from './application/services/fixtures-sync.service';
import { EventoDetalleService } from './application/services/evento-detalle.service';
import { EventosController } from './presentation/controllers/eventos.controller';
import { AdminEventosController } from './presentation/controllers/admin-eventos.controller';

@Module({
  imports: [GamificationModule],
  controllers: [EventosController, AdminEventosController],
  providers: [
    EventosService,
    AdminEventosService,
    FixturesSyncService,
    EventoDetalleService,
  ],
})
export class SportsModule {}
