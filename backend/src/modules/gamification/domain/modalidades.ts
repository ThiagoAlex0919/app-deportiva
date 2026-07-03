/**
 * Catálogo de modalidades de pronóstico soportadas por el dominio.
 *
 * En la BD el campo `Prediccion.tipo` es String (no enum) para que añadir
 * una modalidad NO requiera migración: basta con extender este catálogo
 * (y enseñar al oráculo a resolverla). Es la misma filosofía del schema:
 * lo específico del deporte es dato/dominio, no estructura.
 *
 * Contratos de payload por modalidad (los valida el dominio, no la BD):
 *  - MARCADOR_EXACTO: { "marcador": [local, visitante] }         (deportes de enfrentamiento)
 *  - GANADOR:         { "ganadorId": "<participanteId>" }        (cualquier formato)
 *  - PODIO:           { "podio": ["<id1>", "<id2>", "<id3>"] }   (formatos multitudinarios: F1, ciclismo...)
 */
export const MODALIDADES_SOPORTADAS = [
  'MARCADOR_EXACTO',
  'GANADOR',
  'PODIO',
] as const;

export type Modalidad = (typeof MODALIDADES_SOPORTADAS)[number];

/** Type guard: ¿es una modalidad del catálogo vigente? */
export function esModalidadSoportada(tipo: string): tipo is Modalidad {
  return (MODALIDADES_SOPORTADAS as readonly string[]).includes(tipo);
}
