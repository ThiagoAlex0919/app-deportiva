/**
 * UsersModule — Bounded Context de Identidad (07_modulo_users_jwt.md).
 *
 * Registra el JwtModule GLOBAL (lo consume también el JwtAuthGuard de
 * AppModule) e importa LedgerModule para otorgar el bono de bienvenida
 * a través de su fachada — nunca escribiendo al ledger directamente.
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LedgerModule } from '../ledger/ledger.module';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { UsersController } from './presentation/controllers/users.controller';
import { AdminUsersController } from './presentation/controllers/admin-users.controller';

@Module({
  imports: [
    // global: true → JwtService disponible en toda la app (guard incluido)
    // sin re-importar el módulo en cada Bounded Context.
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      // Cast necesario: jsonwebtoken tipa expiresIn como su tipo StringValue
      // ("15m", "7d"...) y una variable de entorno es string genérico (TS2322).
      // El formato lo validan en runtime las propias libs de JWT.
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_TTL ??
          '15m') as unknown as number,
      },
    }),
    LedgerModule,
  ],
  controllers: [AuthController, UsersController, AdminUsersController],
  providers: [AuthService],
})
export class UsersModule {}
