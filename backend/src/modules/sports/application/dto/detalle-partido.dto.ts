/**
 * DTO de GET /sports/events/:id/detail (doc 13).
 * TODO es condicional: los eventos sin fdId (seed) devuelven solo `evento`;
 * las secciones aparecen según lo que el proveedor entregue para ese partido.
 */
import type { EventoResponse } from './eventos.dto';

export type TipoMomento =
  | 'GOL'
  | 'TARJETA_AMARILLA'
  | 'TARJETA_ROJA'
  | 'CAMBIO';

export interface MomentoPartido {
  minuto: number | null;
  tipo: TipoMomento;
  /** Participante NUESTRO (mapeado desde el team id del proveedor). */
  participanteId: string | null;
  jugador: string | null;
  /** "Penal", "Autogol", "Sale X / Entra Y"... */
  detalle: string | null;
}

export interface FilaCaminoTorneo {
  participanteId: string;
  grupo: string | null;
  posicion: number;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  puntos: number;
}

export interface DetallePartidoResponse {
  evento: EventoResponse;
  /** Minuto de juego si EN VIVO ("63", "45+2"). */
  minuto: string | null;
  marcador: {
    actual: [number, number] | null;
    medioTiempo: [number, number] | null;
  };
  /** Momentos ordenados del más reciente al primero. */
  cronologia: MomentoPartido[];
  ficha: { arbitro: string | null; estadio: string | null };
  /** Standing de cada equipo del partido en el torneo (caché 1h). */
  caminoTorneo: FilaCaminoTorneo[];
}
