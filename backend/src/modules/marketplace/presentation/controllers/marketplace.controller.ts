/**
 * MarketplaceController — Tienda (doc 15).
 *
 *   GET  /api/v1/marketplace/products      (público: catálogo + reglas)
 *   POST /api/v1/marketplace/orders        🔒 checkout con descuento por Tickets
 *   GET  /api/v1/marketplace/orders/mine   🔒 mis pedidos
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../../../../shared/presentation/decorators/current-user.decorator';
import { CatalogoService } from '../../application/services/catalogo.service';
import { OrdenesService } from '../../application/services/ordenes.service';
import {
  CatalogoResponse,
  CrearOrdenDto,
  OrdenResponse,
} from '../../application/dto/marketplace.dto';

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly catalogoService: CatalogoService,
    private readonly ordenesService: OrdenesService,
  ) {}

  @Public()
  @Get('products')
  catalogo(): CatalogoResponse {
    return this.catalogoService.listar();
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  crear(
    @CurrentUser() user: UsuarioAutenticado,
    @Body() dto: CrearOrdenDto,
  ): Promise<OrdenResponse> {
    return this.ordenesService.crear(user.id, dto);
  }

  @Get('orders/mine')
  mias(
    @CurrentUser() user: UsuarioAutenticado,
  ): Promise<{ ordenes: OrdenResponse[] }> {
    return this.ordenesService.listarMias(user.id);
  }
}
