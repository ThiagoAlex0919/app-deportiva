/**
 * @CurrentUser() — extrae el usuario autenticado que el JwtAuthGuard
 * adjuntó al request tras verificar el access token.
 *
 * Sustituye al `usuarioId` que viajaba por query/body (deuda técnica del
 * doc 05, resuelta en 07_modulo_users_jwt.md): la identidad ya no es un
 * dato que el cliente declara, sino un hecho que el token demuestra.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Payload mínimo que el guard adjunta al request. */
export interface UsuarioAutenticado {
  id: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: UsuarioAutenticado }>();
    return request.user;
  },
);
