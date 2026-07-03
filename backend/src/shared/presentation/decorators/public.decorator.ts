/**
 * @Public() — excluye una ruta del JwtAuthGuard global.
 *
 * Filosofía secure-by-default (07_modulo_users_jwt.md §2.3): TODO endpoint
 * requiere access token salvo que se marque explícitamente como público.
 * Así, olvidar proteger un endpoint nuevo es imposible; olvidar abrirlo
 * se detecta al primer request (401), que es el fallo seguro.
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
