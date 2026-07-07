/**
 * MarketplaceModule — Bounded Context de comercio (doc 15).
 * Catálogo en config editable; órdenes con snapshot; Tickets como DESCUENTO
 * vía la fachada del Ledger (cobro idempotente + reverso en cancelación).
 * v2: pasarela de pagos (Wompi/MercadoPago) cuando exista cuenta de comercio.
 */
import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { CatalogoService } from './application/services/catalogo.service';
import { OrdenesService } from './application/services/ordenes.service';
import { MarketplaceController } from './presentation/controllers/marketplace.controller';
import { AdminOrdenesController } from './presentation/controllers/admin-ordenes.controller';

@Module({
  imports: [LedgerModule],
  controllers: [MarketplaceController, AdminOrdenesController],
  providers: [CatalogoService, OrdenesService],
})
export class MarketplaceModule {}
