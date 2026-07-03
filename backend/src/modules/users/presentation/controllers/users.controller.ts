/**
 * UsersController — rutas protegidas del perfil.
 *
 * GET /api/v1/users/me — perfil del usuario del token (sin @Public: el
 * JwtAuthGuard global exige Bearer y @CurrentUser entrega la identidad).
 */
import { Controller, Get } from '@nestjs/common';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../../../../shared/presentation/decorators/current-user.decorator';
import { AuthService } from '../../application/services/auth.service';
import { PerfilResponse } from '../../application/dto/auth.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: UsuarioAutenticado): Promise<PerfilResponse> {
    return this.authService.perfil(user.id);
  }
}
