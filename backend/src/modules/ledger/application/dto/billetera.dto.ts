/**
 * DTOs HTTP de la billetera (lecturas del ledger).
 *
 * Deuda técnica RESUELTA (07_modulo_users_jwt.md): el usuario ya NO viaja
 * por query — sale del access token vía @CurrentUser en el controller.
 */
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** Query de GET /ledger/history (paginación por cursor). */
export class ConsultarHistorialQueryDto {
  /** Id del último asiento visto; omitir para la primera página. */
  @IsOptional()
  @IsUUID('4')
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

/** Respuesta de GET /ledger/balance */
export interface SaldoResponse {
  usuarioId: string;
  /** Saldo DERIVADO del ledger (nunca almacenado — regla del doc 02). */
  saldo: number;
  calculadoEn: string;
}

/** Respuesta de GET /ledger/history */
export interface HistorialResponse {
  usuarioId: string;
  movimientos: Array<{
    asientoId: string;
    fecha: string;
    /** DEBITO = salida de tickets, CREDITO = entrada. */
    direccion: 'DEBITO' | 'CREDITO';
    cantidad: number;
    modulo: string;
    motivo: string;
    descripcion: string | null;
    transaccionId: string;
  }>;
  nextCursor: string | null;
}
