/**
 * GamificationModule — Bounded Context "Gamificación".
 *
 * Regla del monolito modular: prohibido importar entidades, repositorios
 * o cualquier interno de otro módulo — solo lo que su módulo exporta.
 *
 * ECONOMÍA v2 + Oráculo (docs 09/10): pronosticar es gratis; el Ledger se
 * usa SOLO para pagar recompensas por acierto (OraculoService). Exporta el
 * Oráculo como fachada para que Sports lo invoque al cerrar eventos.
 * Aquí vivirá el motor de reglas (misiones, logros) en fases posteriores.
 */
import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { PrediccionesService } from './application/services/predicciones.service';
import { OraculoService } from './application/services/oraculo.service';
import { PrediccionesController } from './presentation/controllers/predicciones.controller';

@Module({
  imports: [LedgerModule],
  controllers: [PrediccionesController],
  providers: [PrediccionesService, OraculoService],
  exports: [OraculoService],
})
export class GamificationModule {}
