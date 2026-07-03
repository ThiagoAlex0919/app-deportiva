/**
 * PrediccionesController — API pública de pronósticos.
 *
 * Ruta (con el prefijo global api/v1):
 *   POST /api/v1/gamification/predictions
 *
 * El body se valida con class-validator (ValidationPipe global de main.ts);
 * los errores de negocio (saldo insuficiente, evento cerrado) llegan como
 * DomainException y los traduce el filtro global.
 */
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PrediccionesService } from '../../application/services/predicciones.service';
import {
  CrearPrediccionDto,
  PrediccionResponse,
} from '../../application/dto/crear-prediccion.dto';

@Controller('gamification')
export class PrediccionesController {
  constructor(private readonly prediccionesService: PrediccionesService) {}

  /**
   * Crea un pronóstico sobre un evento, cobrando la inscripción en Tickets.
   * Idempotente: repetir la llamada para el mismo usuario+evento no cobra
   * dos veces (devuelve `yaExistia: true`).
   */
  @Post('predictions')
  @HttpCode(HttpStatus.CREATED)
  async crearPrediccion(
    @Body() dto: CrearPrediccionDto,
  ): Promise<PrediccionResponse> {
    return this.prediccionesService.crearPrediccion(dto);
  }
}
