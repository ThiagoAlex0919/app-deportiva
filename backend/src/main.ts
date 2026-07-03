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
  const origenes = (
    process.env.CORS_ORIGIN ?? 'http://localhost:3001'
  ).split(',');
  app.enableCors({ origin: origenes });

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
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[backend] API escuchando en http://localhost:${port}/api/v1`);
}

void bootstrap();
