/**
 * NoticiasController — feed público de noticias (doc 11).
 *
 *   GET /api/v1/content/news?deporte=&cursor=&limit=
 *
 * @Public(): el feed es contenido abierto. Además, el keep-alive del repo
 * hace ping aquí cada 10 min — mantiene el servicio despierto Y el feed
 * fresco en el mismo request.
 */
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import { NoticiasService } from '../../application/services/noticias.service';
import {
  ConsultarNoticiasQueryDto,
  NoticiaResponse,
  NoticiasResponse,
} from '../../application/dto/noticias.dto';

@Public()
@Controller('content')
export class NoticiasController {
  constructor(private readonly noticiasService: NoticiasService) {}

  @Get('news')
  listar(@Query() query: ConsultarNoticiasQueryDto): Promise<NoticiasResponse> {
    return this.noticiasService.listar({
      deporte: query.deporte,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /** Detalle para la página interna /noticia/[id]. */
  @Get('news/:id')
  obtener(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<NoticiaResponse> {
    return this.noticiasService.obtener(id);
  }
}
