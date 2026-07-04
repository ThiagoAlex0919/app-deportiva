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
import { PrediccionesService } from './application/services/predicciones.service';
import { PrediccionesController } from './presentation/controllers/predicciones.controller';

@Module({
  // ECONOMÍA v2: sin imports del Ledger — pronosticar es gratis. El oráculo
  // y el módulo de Torneos reintroducirán LedgerModule cuando paguen/cobren.
  controllers: [PrediccionesController],
  providers: [PrediccionesService],
})
export class GamificationModule {}
