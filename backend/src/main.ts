/**
 * Punto de entrada del Monolito Modular.
 *
 * Responsabilidades (solo bootstrap, cero lógica de negocio):
 *  - Prefijo global de API con versionado: /api/v1/...
 *  - ValidationPipe global: todo DTO se valida con class-validator.
 *    `whitelist: true` descarta propiedades no declaradas (defensa contra
 *    mass-assignment); `transform: true` convierte tipos primitivos de query/params.
 *  - Filtro global que traduce DomainException -> respuesta HTTP coherente.
 */
import 'dotenv/config'; // carga .env antes que cualquier lectura de process.env
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './shared/presentation/filters/domain-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // CORS: orígenes permitidos separados por coma (frontend local y desplegado).
  // Entradas que empiezan con "*." se tratan como comodín de subdominio
  // (ej. "*.vercel.app" acepta cualquier preview del proyecto en Vercel).
  const entradas = (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(
    ',',
  );
  const exactos = entradas.filter((e) => !e.startsWith('*.'));
  const sufijos = entradas
    .filter((e) => e.startsWith('*.'))
    .map((e) => e.slice(1)); // "*.vercel.app" -> ".vercel.app"
  app.enableCors({
    origin: (origin, callback) => {
      // Requests sin header Origin (curl, server-to-server): permitidas.
      if (!origin) {
        callback(null, true);
        return;
      }
      let hostname = '';
      try {
        hostname = new URL(origin).hostname;
      } catch {
        // Origin malformado: se trata como no permitido, jamás como crash.
      }
      const permitido =
        exactos.includes(origin) || sufijos.some((s) => hostname.endsWith(s));
      callback(null, permitido);
    },
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new DomainExceptionFilter());

  const port = Number(process.env.PORT ?? 3000);
  // 0.0.0.0: necesario en contenedores/PaaS (Render) para que el port scan lo detecte.
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[backend] API escuchando en http://localhost:${port}/api/v1`);
}

void bootstrap();
