/**
 * GamificationModule — Bounded Context "Gamificación" (esqueleto del slice).
 *
 * Importa LedgerModule SOLO para inyectar su fachada (LedgerService).
 * Regla del monolito modular: prohibido importar entidades, repositorios
 * o cualquier interno de otro módulo — solo lo que su módulo exporta.
 *
 * Aquí vivirá el motor de reglas (misiones, logros) en fases posteriores;
 * por ahora aloja el primer caso de uso económico: pronósticos.
 */
import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { PrediccionesService } from './application/services/predicciones.service';
import { PrediccionesController } from './presentation/controllers/predicciones.controller';

@Module({
  imports: [LedgerModule],
  controllers: [PrediccionesController],
  providers: [PrediccionesService],
})
export class GamificationModule {}
