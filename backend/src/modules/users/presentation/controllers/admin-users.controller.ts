/**
 * AdminUsersController — backoffice de usuarios.
 *
 *   POST /api/v1/admin/users/reset-password   (header X-Admin-Key)
 *   body: { "email": "...", "nuevaPassword": "..." }
 *
 * Vía operativa para recuperar cuentas mientras no exista el flujo
 * "olvidé mi contraseña" por email (registrado en la cola del doc 05).
 * Además revoca todos los refresh tokens del usuario: una cuenta
 * recuperada no debe tener sesiones viejas vivas.
 */
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import { AdminKeyGuard } from '../../../../shared/presentation/guards/admin-key.guard';
import { AuthService } from '../../application/services/auth.service';

class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'nuevaPassword debe tener al menos 8 caracteres' })
  nuevaPassword!: string;
}

@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly authService: AuthService) {}

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
    return this.authService.resetPassword(dto.email, dto.nuevaPassword);
  }
}
