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
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../../../../shared/presentation/decorators/current-user.decorator';
import { PrediccionesService } from '../../application/services/predicciones.service';
import {
  CrearPrediccionDto,
  MisPrediccionesResponse,
  PrediccionResponse,
} from '../../application/dto/crear-prediccion.dto';

/** Query de GET /gamification/predictions/mine */
class MisPrediccionesQueryDto {
  @IsOptional()
  @IsUUID('4')
  eventoId?: string;
}

@Controller('gamification')
export class PrediccionesController {
  constructor(private readonly prediccionesService: PrediccionesService) {}

  /**
   * Crea un pronóstico sobre un evento, cobrando la inscripción en Tickets.
   * Requiere Bearer token: el usuario sale de @CurrentUser, no del body.
   * Idempotente: repetir la llamada para el mismo usuario+evento+modalidad
   * no cobra dos veces (devuelve `yaExistia: true`).
   */
  /** Pronósticos del usuario autenticado (para pintar el estado del widget). */
  @Get('predictions/mine')
  misPredicciones(
    @CurrentUser() user: UsuarioAutenticado,
    @Query() query: MisPrediccionesQueryDto,
  ): Promise<MisPrediccionesResponse> {
    return this.prediccionesService.listarMias(user.id, query.eventoId);
  }

  @Post('predictions')
  @HttpCode(HttpStatus.CREATED)
  async crearPrediccion(
    @CurrentUser() user: UsuarioAutenticado,
    @Body() dto: CrearPrediccionDto,
  ): Promise<PrediccionResponse> {
    return this.prediccionesService.crearPrediccion(user.id, dto);
  }
}
