/**
 * Configuración de Prisma 7 (reemplaza la propiedad `url` del datasource
 * que en Prisma <= 6 vivía dentro de schema.prisma).
 *
 * La usa el CLI de Prisma (migrate, studio, generate). En runtime, la
 * conexión se establece vía driver adapter en `PrismaService`
 * (src/shared/infrastructure/prisma/prisma.service.ts).
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // 12-factor: la URL de conexión SIEMPRE viene del entorno.
    url: process.env.DATABASE_URL,
  },
});
