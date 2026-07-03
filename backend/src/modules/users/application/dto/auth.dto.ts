/**
 * DTOs HTTP del módulo Users (07_modulo_users_jwt.md).
 * Validados por el ValidationPipe global (main.ts).
 */
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'email debe ser una dirección válida' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password debe tener al menos 8 caracteres' })
  password!: string;

  @IsOptional()
  @IsString()
  nombre?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'email debe ser una dirección válida' })
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

/** Respuesta de register/login/refresh: identidad + par de tokens. */
export interface AuthResponse {
  usuario: PerfilResponse;
  /** JWT de corta vida (15 min): va en Authorization: Bearer. */
  accessToken: string;
  /** Token opaco de 7 días: SOLO se usa contra /auth/refresh y /auth/logout. */
  refreshToken: string;
}

export interface PerfilResponse {
  id: string;
  email: string;
  nombre: string | null;
  createdAt: string;
}
