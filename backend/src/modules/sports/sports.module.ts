/**
 * SportsModule — Bounded Context del catálogo deportivo (doc 08).
 * Solo lectura en esta fase. No exporta fachada todavía: cuando Gamification
 * necesite validar eventos vía fachada (TODO en PrediccionesService), este
 * módulo exportará EventosService.
 */
import { Module } from '@nestjs/common';
import { EventosService } from './application/services/eventos.service';
import { EventosController } from './presentation/controllers/eventos.controller';

@Module({
  controllers: [EventosController],
  providers: [EventosService],
})
export class SportsModule {}
