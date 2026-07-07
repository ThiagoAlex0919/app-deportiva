/**
 * AdminOrdenesController — backoffice de pedidos (doc 15).
 *
 *   POST /api/v1/admin/marketplace/orders/:id/status   (header X-Admin-Key)
 *   body: { "estado": "PAGADA" | "ENVIADA" | "ENTREGADA" | "CANCELADA" }
 *
 * v1 sin pasarela: tú coordinas el pago y avanzas el estado desde aquí.
 * CANCELADA reversa los tickets del descuento automáticamente.
 */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import { AdminKeyGuard } from '../../../../shared/presentation/guards/admin-key.guard';
import { OrdenesService } from '../../application/services/ordenes.service';
import {
  CambiarEstadoOrdenDto,
  OrdenResponse,
} from '../../application/dto/marketplace.dto';

@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin/marketplace/orders')
export class AdminOrdenesController {
  constructor(private readonly ordenesService: OrdenesService) {}

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  cambiarEstado(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CambiarEstadoOrdenDto,
  ): Promise<OrdenResponse> {
    return this.ordenesService.cambiarEstado(id, dto.estado);
  }
}
