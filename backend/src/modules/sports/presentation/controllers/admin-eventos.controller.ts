/**
 * AdminEventosController — backoffice de eventos (doc 10).
 *
 *   POST /api/v1/admin/events/:id/finish   (header X-Admin-Key)
 *
 * @Public() salta el JwtAuthGuard global (no es un endpoint de usuarios);
 * AdminKeyGuard exige la API key operativa. Ver nota del guard: puente
 * hasta que existan roles (users v2).
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
import { AdminEventosService } from '../../application/services/admin-eventos.service';
import {
  FinalizarEventoDto,
  FinalizarEventoResponse,
} from '../../application/dto/finalizar-evento.dto';

@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin/events')
export class AdminEventosController {
  constructor(private readonly adminEventosService: AdminEventosService) {}

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  finalizar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: FinalizarEventoDto,
  ): Promise<FinalizarEventoResponse> {
    return this.adminEventosService.finalizarEvento(id, dto);
  }
}
