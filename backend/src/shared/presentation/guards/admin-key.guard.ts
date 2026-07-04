/**
 * AdminKeyGuard — protege endpoints operativos con una API key estática
 * (header `X-Admin-Key` contra la env ADMIN_API_KEY).
 *
 * PUENTE PRAGMÁTICO (doc 10): los roles de usuario llegarán con users v2;
 * mientras tanto, el cierre de eventos es una operación de backoffice que
 * no puede depender de cuentas de usuario normales.
 *
 * Se usa JUNTO a @Public() (para saltar el JwtAuthGuard global) +
 * @UseGuards(AdminKeyGuard) en el controller.
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const esperada = process.env.ADMIN_API_KEY;
    if (!esperada) {
      // Sin key configurada, el endpoint queda deshabilitado — fallo seguro.
      throw new UnauthorizedException({
        codigo: 'ADMIN_DESHABILITADO',
        mensaje: 'ADMIN_API_KEY no está configurada en el servidor',
      });
    }

    const request = context.switchToHttp().getRequest<Request>();
    const recibida = request.headers['x-admin-key'];

    // Comparación en tiempo constante: una key inválida no filtra longitud
    // ni prefijos por timing.
    const valida =
      typeof recibida === 'string' &&
      recibida.length === esperada.length &&
      timingSafeEqual(Buffer.from(recibida), Buffer.from(esperada));

    if (!valida) {
      throw new UnauthorizedException({
        codigo: 'ADMIN_KEY_INVALIDA',
        mensaje: 'Header X-Admin-Key ausente o incorrecto',
      });
    }
    return true;
  }
}
