/**
 * EventosController — API pública del catálogo (08_modulo_sports_y_home.md).
 *
 * Con el prefijo global api/v1:
 *   GET /api/v1/sports/events?estado=&cursor=&limit=
 *   GET /api/v1/sports/events/:id
 *
 * @Public(): el catálogo es contenido abierto — el Home debe funcionar
 * sin sesión (los pronósticos, en cambio, sí exigen token).
 */
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import { EventosService } from '../../application/services/eventos.service';
import {
  ConsultarEventosQueryDto,
  EventoResponse,
  EventosResponse,
} from '../../application/dto/eventos.dto';

@Public()
@Controller('sports')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get('events')
  listar(@Query() query: ConsultarEventosQueryDto): Promise<EventosResponse> {
    return this.eventosService.listar({
      estado: query.estado,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get('events/:id')
  obtener(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<EventoResponse> {
    return this.eventosService.obtener(id);
  }
}
