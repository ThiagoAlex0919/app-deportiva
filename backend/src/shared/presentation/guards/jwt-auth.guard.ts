/**
 * JwtAuthGuard — guard GLOBAL de autenticación (registrado como APP_GUARD
 * en AppModule). Verifica el access token de TODAS las rutas salvo las
 * marcadas con @Public().
 *
 * Guard propio en vez de Passport (decisión de 07_modulo_users_jwt.md §2.5):
 * la verificación de un Bearer JWT son ~30 líneas transparentes; Passport
 * añadiría dos dependencias y una capa de indirection sin beneficio aquí.
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { UsuarioAutenticado } from '../decorators/current-user.decorator';

/** Claims que firma AuthService al emitir el access token. */
interface AccessTokenPayload {
  sub: string; // usuarioId (claim estándar JWT)
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Las rutas @Public() (login, register, refresh) pasan sin token.
    const esPublica = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (esPublica) return true;

    // 2. Extraer el Bearer token del header Authorization.
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>();
    const [esquema, token] = request.headers.authorization?.split(' ') ?? [];
    if (esquema !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        codigo: 'TOKEN_REQUERIDO',
        mensaje: 'Falta el header Authorization: Bearer <accessToken>',
      });
    }

    // 3. Verificar firma y expiración; adjuntar la identidad al request
    //    para que @CurrentUser() la entregue a los controllers.
    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException({
        codigo: 'TOKEN_INVALIDO',
        mensaje: 'El access token es inválido o expiró. Usa /auth/refresh.',
      });
    }
  }
}
