/**
 * AuthService — casos de uso de identidad (07_modulo_users_jwt.md).
 *
 * Diseño de tokens:
 *  - ACCESS: JWT firmado (JWT_SECRET), 15 min. Stateless: se verifica sin BD.
 *  - REFRESH: token OPACO (48 bytes aleatorios), 7 días, persistido como
 *    SHA-256 en `refresh_tokens`. Nunca se guarda en claro: un dump de la BD
 *    no permite fabricar sesiones. ROTACIÓN en cada uso: el refresh usado se
 *    revoca y se emite uno nuevo — un token robado muere en cuanto el
 *    legítimo (o el ladrón) rota, limitando la ventana de abuso.
 *
 * El registro otorga el bono de bienvenida vía LedgerService (fachada del
 * contexto Economía): 500 tickets desde TESORERIA, idempotente por usuario.
 */
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { LedgerService } from '../../../ledger/application/services/ledger.service';
import {
  AuthResponse,
  LoginDto,
  PerfilResponse,
  RegisterDto,
} from '../dto/auth.dto';

const BONO_BIENVENIDA = 500;
const REFRESH_TTL_DIAS = 7;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    // Fachada del Bounded Context Economía — única vía para emitir tickets.
    private readonly ledgerService: LedgerService,
  ) {}

  /** Registro: crea el usuario, otorga el bono y abre sesión. */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();

    const existente = await this.prisma.usuario.findUnique({
      where: { email },
    });
    if (existente) {
      // 409: el recurso ya existe. Mensaje deliberadamente igual de específico
      // que el flujo de login para no facilitar enumeración masiva de emails
      // más de lo que el unique constraint ya implica.
      throw new DomainException(
        'Ese email ya está registrado',
        'EMAIL_YA_REGISTRADO',
        409,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const usuario = await this.prisma.usuario.create({
      data: { email, nombre: dto.nombre?.trim() || null, passwordHash },
    });

    // Bono de bienvenida: idempotencyKey por usuario — si el proceso muriera
    // tras crear el usuario y reintentaran el registro (email ya existe, 409),
    // el bono jamás podría duplicarse de todas formas.
    await this.ledgerService.registrarTransaccion({
      modulo: 'USUARIOS',
      motivo: 'BONO',
      descripcion: 'Bono de bienvenida',
      referencia: { tipo: 'REGISTRO', id: usuario.id },
      idempotencyKey: `BONO_REGISTRO:${usuario.id}`,
      asientos: [
        {
          cuenta: { tipo: 'SISTEMA', codigo: 'TESORERIA' },
          direccion: 'DEBITO',
          cantidad: BONO_BIENVENIDA,
        },
        {
          cuenta: { tipo: 'USUARIO', usuarioId: usuario.id },
          direccion: 'CREDITO',
          cantidad: BONO_BIENVENIDA,
        },
      ],
    });
    this.logger.log(`Usuario ${usuario.id} registrado con bono de bienvenida`);

    return this.abrirSesion(usuario);
  }

  /** Login con email + password. */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    // Mensaje único para "no existe" y "password incorrecta": no revelar
    // cuál de las dos falló (mitiga enumeración de cuentas).
    const credencialesInvalidas = new DomainException(
      'Email o contraseña incorrectos',
      'CREDENCIALES_INVALIDAS',
      401,
    );
    if (!usuario?.passwordHash) throw credencialesInvalidas;

    const ok = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!ok) throw credencialesInvalidas;

    return this.abrirSesion(usuario);
  }

  /** Rotación: valida el refresh vigente, lo revoca y emite un par nuevo. */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const fila = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(refreshToken) },
      include: { usuario: true },
    });
    if (!fila || fila.revokedAt || fila.expiresAt < new Date()) {
      throw new DomainException(
        'Sesión expirada. Inicia sesión de nuevo.',
        'REFRESH_INVALIDO',
        401,
      );
    }

    // Revocar ANTES de emitir el nuevo par (rotación estricta).
    await this.prisma.refreshToken.update({
      where: { id: fila.id },
      data: { revokedAt: new Date() },
    });

    return this.abrirSesion(fila.usuario);
  }

  /** Logout: revoca el refresh token activo (el access expira solo). */
  async logout(refreshToken: string): Promise<{ ok: true }> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  /**
   * Reset de contraseña por BACKOFFICE (X-Admin-Key) — puente hasta el flujo
   * "olvidé mi contraseña" por email. Revoca todas las sesiones del usuario.
   */
  async resetPassword(
    email: string,
    nuevaPassword: string,
  ): Promise<{ ok: true }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!usuario) {
      throw new DomainException(
        'No existe un usuario con ese email',
        'RECURSO_NO_ENCONTRADO',
        404,
      );
    }
    const passwordHash = await bcrypt.hash(nuevaPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { passwordHash },
      }),
      // Sesiones viejas fuera: la cuenta recuperada arranca limpia.
      this.prisma.refreshToken.updateMany({
        where: { usuarioId: usuario.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    this.logger.log(`Password reseteada por backoffice para ${usuario.id}`);
    return { ok: true };
  }

  /** Perfil del usuario autenticado (GET /users/me). */
  async perfil(usuarioId: string): Promise<PerfilResponse> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
    });
    return this.aPerfil(usuario);
  }

  // ------------------------------------------------------------------
  // Helpers privados
  // ------------------------------------------------------------------

  /** Emite el par access+refresh y persiste el hash del refresh. */
  private async abrirSesion(usuario: {
    id: string;
    email: string;
    nombre: string | null;
    createdAt: Date;
  }): Promise<AuthResponse> {
    const accessToken = await this.jwtService.signAsync({
      sub: usuario.id,
      email: usuario.email,
    });

    // Token opaco: 48 bytes CSPRNG en base64url (64 chars, URL-safe).
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(
      Date.now() + REFRESH_TTL_DIAS * 24 * 60 * 60 * 1000,
    );
    await this.prisma.refreshToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: this.hash(refreshToken),
        expiresAt,
      },
    });

    return { usuario: this.aPerfil(usuario), accessToken, refreshToken };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private aPerfil(u: {
    id: string;
    email: string;
    nombre: string | null;
    createdAt: Date;
  }): PerfilResponse {
    return {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      createdAt: u.createdAt.toISOString(),
    };
  }
}
