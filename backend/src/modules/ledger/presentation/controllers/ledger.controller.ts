/**
 * LedgerController — API pública de LECTURA de la billetera.
 *
 * Rutas (con el prefijo global api/v1, ambas requieren Bearer token):
 *   GET /api/v1/ledger/balance
 *   GET /api/v1/ledger/history?cursor=...&limit=...
 *
 * Deliberadamente NO existe un POST /ledger/...: la escritura al ledger es
 * un contrato interno entre módulos (LedgerService), jamás un endpoint
 * público — nadie "se deposita" tickets por HTTP.
 *
 * La identidad sale del access token (@CurrentUser) — deuda técnica del
 * usuarioId por query RESUELTA (07_modulo_users_jwt.md).
 */
import { Controller, Get, Query } from '@nestjs/common';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../../../../shared/presentation/decorators/current-user.decorator';
import { BilleteraService } from '../../application/services/billetera.service';
import {
  ConsultarHistorialQueryDto,
  HistorialResponse,
  SaldoResponse,
} from '../../application/dto/billetera.dto';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly billeteraService: BilleteraService) {}

  /**
   * Saldo actual de tickets del usuario autenticado.
   * Derivado en vivo del ledger (fuente de verdad única).
   */
  @Get('balance')
  async obtenerSaldo(
    @CurrentUser() user: UsuarioAutenticado,
  ): Promise<SaldoResponse> {
    return this.billeteraService.obtenerSaldo(user.id);
  }

  /**
   * Historial de movimientos de la billetera, paginado por cursor.
   * Alimenta la vista "Billetera" del frontend (04_sitemap_y_ux.md).
   */
  @Get('history')
  async obtenerHistorial(
    @CurrentUser() user: UsuarioAutenticado,
    @Query() query: ConsultarHistorialQueryDto,
  ): Promise<HistorialResponse> {
    return this.billeteraService.obtenerHistorial(user.id, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
