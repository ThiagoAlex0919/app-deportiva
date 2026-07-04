/**
 * Resolutores del Oráculo — estrategia de acierto por modalidad (doc 10).
 *
 * Espejo de `modalidades.ts`: añadir una modalidad = añadir su resolutor
 * aquí (y su recompensa en config/recompensas.json). Sin migraciones.
 *
 * Un resolutor es una función PURA: (payload, contexto) → acertó o no.
 * Nunca lanza: un payload malformado simplemente no acierta (el pronóstico
 * ya fue validado al crearse; esto es defensa en profundidad).
 */
import type { Modalidad } from './modalidades';

export interface ContextoResolucion {
  /** Resultado global del evento (Json específico del deporte). */
  resultado: Record<string, unknown>;
  /** participanteId → posicionFinal (1 = ganador), desde EventoParticipante. */
  posiciones: Map<string, number>;
}

export type Resolutor = (
  payload: Record<string, unknown>,
  ctx: ContextoResolucion,
) => boolean;

/** MARCADOR_EXACTO: [local, visitante] idénticos al resultado global. */
const marcadorExacto: Resolutor = (payload, ctx) => {
  const pronosticado = payload.marcador;
  const real = ctx.resultado.marcador;
  return (
    Array.isArray(pronosticado) &&
    Array.isArray(real) &&
    pronosticado.length === 2 &&
    real.length === 2 &&
    pronosticado[0] === real[0] &&
    pronosticado[1] === real[1]
  );
};

/** GANADOR: el participante pronosticado terminó con posicionFinal = 1. */
const ganador: Resolutor = (payload, ctx) => {
  const id = payload.ganadorId;
  return typeof id === 'string' && ctx.posiciones.get(id) === 1;
};

/** PODIO: los 3 pronosticados coinciden con el top-3 EN ORDEN EXACTO. */
const podio: Resolutor = (payload, ctx) => {
  const pronosticado = payload.podio;
  if (!Array.isArray(pronosticado) || pronosticado.length !== 3) return false;
  return pronosticado.every(
    (id, indice) =>
      typeof id === 'string' && ctx.posiciones.get(id) === indice + 1,
  );
};

export const RESOLUTORES: Record<Modalidad, Resolutor> = {
  MARCADOR_EXACTO: marcadorExacto,
  GANADOR: ganador,
  PODIO: podio,
};
