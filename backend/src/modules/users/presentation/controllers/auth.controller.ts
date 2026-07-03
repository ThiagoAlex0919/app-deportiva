/**
 * AuthController — rutas públicas de identidad (07_modulo_users_jwt.md).
 *
 * Con el prefijo global api/v1:
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/refresh
 *   POST /api/v1/auth/logout
 *
 * Todas llevan @Public(): son las únicas puertas de entrada sin token.
 */
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import { AuthService } from '../../application/services/auth.service';
import {
  AuthResponse,
  LoginDto,
  RefreshDto,
  RegisterDto,
} from '../../application/dto/auth.dto';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshDto): Promise<{ ok: true }> {
    return this.authService.logout(dto.refreshToken);
  }
}
