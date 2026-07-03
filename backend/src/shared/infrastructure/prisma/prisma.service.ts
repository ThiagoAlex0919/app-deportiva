/**
 * PrismaService — único dueño de la conexión a PostgreSQL.
 *
 * Prisma 7: la URL no vive en schema.prisma; el cliente se construye con un
 * driver adapter (@prisma/adapter-pg) alimentado por DATABASE_URL (12-factor).
 *
 * Los repositorios de infraestructura de cada módulo inyectan este servicio.
 * PROHIBIDO inyectarlo en capas domain/ o application/ de los módulos:
 * esas capas dependen de puertos (interfaces), no de Prisma.
 */
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      // Fallar rápido y con mensaje claro: sin BD no hay aplicación.
      throw new Error(
        'DATABASE_URL no está definida. Copia .env.example a .env y configúrala.',
      );
    }
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  /** Conecta al iniciar el módulo para detectar problemas de BD en el arranque. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** Cierre limpio de conexiones al apagar la aplicación (graceful shutdown). */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
