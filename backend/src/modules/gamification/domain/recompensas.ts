/**
 * Catálogo de recompensas por modalidad (doc 10).
 *
 * Los montos viven en `config/recompensas.json` — EDITABLES sin tocar código
 * (⚠️ valores dummy hasta aterrizar el modelo de negocio). Este módulo los
 * carga una vez al arrancar, con defaults de respaldo si el archivo falta
 * o está corrupto: el oráculo nunca debe caerse por configuración.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Modalidad } from './modalidades';

const DEFAULTS: Record<Modalidad, number> = {
  MARCADOR_EXACTO: 200,
  GANADOR: 75,
  PODIO: 250,
};

function cargar(): Record<Modalidad, number> {
  try {
    // cwd = raíz del backend tanto en dev (nest start) como en prod (node dist/main).
    const crudo = readFileSync(
      join(process.cwd(), 'config', 'recompensas.json'),
      'utf8',
    );
    const json = JSON.parse(crudo) as Record<string, unknown>;
    const resultado = { ...DEFAULTS };
    for (const modalidad of Object.keys(DEFAULTS) as Modalidad[]) {
      const valor = json[modalidad];
      if (typeof valor === 'number' && Number.isInteger(valor) && valor > 0) {
        resultado[modalidad] = valor;
      }
    }
    return resultado;
  } catch {
    return DEFAULTS;
  }
}

const RECOMPENSAS = cargar();

/** Tickets que paga el oráculo por acertar la modalidad dada. */
export function recompensaPorModalidad(modalidad: Modalidad): number {
  return RECOMPENSAS[modalidad];
}
