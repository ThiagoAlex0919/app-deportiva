/**
 * ContentModule — Bounded Context de contenido (doc 11).
 * Fase 1: noticias agregadas por RSS. Absorberá APIs pagas y contenido
 * editorial propio sin cambiar el contrato (solo cambia `fuente`).
 */
import { Module } from '@nestjs/common';
import { NoticiasService } from './application/services/noticias.service';
import { NoticiasController } from './presentation/controllers/noticias.controller';

@Module({
  controllers: [NoticiasController],
  providers: [NoticiasService],
})
export class ContentModule {}
