/**
 * DomainException — error de negocio, agnóstico de HTTP.
 *
 * Las capas domain/ y application/ lanzan SIEMPRE esta excepción (o subclases),
 * nunca HttpException de NestJS: el dominio no sabe que existe HTTP.
 * El DomainExceptionFilter (capa presentation compartida) la traduce a la
 * respuesta HTTP adecuada usando `httpStatus` como sugerencia.
 */
export class DomainException extends Error {
  constructor(
    /** Mensaje legible para el consumidor de la API. */
    message: string,
    /** Código estable y machine-readable (ej. 'SALDO_INSUFICIENTE'). */
    public readonly codigo: string,
    /** Status HTTP sugerido; 422 (Unprocessable Entity) por defecto. */
    public readonly httpStatus: number = 422,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}

/** El recurso referenciado no existe (se traduce a 404). */
export class RecursoNoEncontradoException extends DomainException {
  constructor(recurso: string, id: string) {
    super(`${recurso} con id "${id}" no existe`, 'RECURSO_NO_ENCONTRADO', 404);
  }
}
