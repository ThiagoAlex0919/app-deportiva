/**
 * LedgerController — API pública de LECTURA de la billetera.
 *
 * Rutas (con el prefijo global api/v1):
 *   GET /api/v1/ledger/balance?usuarioId=...
 *   GET /api/v1/ledger/history?usuarioId=...&cursor=...&limit=...
 *
 * Deliberadamente NO existe un POST /ledger/...: la escritura al ledger es
 * un contrato interno entre módulos (LedgerService), jamás un endpoint
 * público — nadie "se deposita" tickets por HTTP.
 *
 * TEMPORAL: usuarioId por query param hasta que exista el módulo users
 * (JWT). Entonces se protegerá con JwtAuthGuard y @CurrentUser.
 */
import { Controller, Get, Query } from '@nestjs/common';
import { BilleteraService } from '../../application/services/billetera.service';
import {
  ConsultarHistorialQueryDto,
  ConsultarSaldoQueryDto,
  HistorialResponse,
  SaldoResponse,
} from '../../application/dto/billetera.dto';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly billeteraService: BilleteraService) {}

  /**
   * Saldo actual de tickets del usuario.
   * Derivado en vivo del ledger (fuente de verdad única).
   */
  @Get('balance')
  async obtenerSaldo(
    @Query() query: ConsultarSaldoQueryDto,
  ): Promise<SaldoResponse> {
    return this.billeteraService.obtenerSaldo(query.usuarioId);
  }

  /**
   * Historial de movimientos de la billetera, paginado por cursor.
   * Alimenta la vista "Billetera" del frontend (04_sitemap_y_ux.md).
   */
  @Get('history')
  async obtenerHistorial(
    @Query() query: ConsultarHistorialQueryDto,
  ): Promise<HistorialResponse> {
    return this.billeteraService.obtenerHistorial(query.usuarioId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
