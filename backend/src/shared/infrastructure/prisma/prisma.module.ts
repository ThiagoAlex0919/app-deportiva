/**
 * Módulo global de acceso a datos.
 *
 * `@Global()` para no repetir el import en cada Bounded Context: la conexión
 * a la base es infraestructura transversal, no pertenece a ningún dominio.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
