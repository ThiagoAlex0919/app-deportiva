/**
 * EventoDetalleService — detalle en vivo de un partido (doc 13).
 *
 * Fuente: football-data.org /v4/matches/{fdId} para eventos sincronizados
 * (metadata.fdId). Eventos del seed devuelven solo la base — la UI es
 * condicional por diseño.
 *
 * Presupuesto de requests (free tier: 10/min):
 *  - Detalle: caché 60s si EN_VIVO (marcador fresco), 15 min si no.
 *  - Standings: caché 1h por competición.
 *  - Sin polling del lado del servidor: el fetch ocurre al entrar a la
 *    página (y con el botón "Actualizar" en vivo).
 */
import { Injectable, Logger } from '@nestjs/common';
import { EstadoEvento } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EventosService } from './eventos.service';
import {
  DetallePartidoResponse,
  FilaCaminoTorneo,
  MomentoPartido,
} from '../dto/detalle-partido.dto';

/* ---------- Tipos mínimos de las respuestas de football-data ---------- */

interface EquipoRefFd {
  id: number | null;
}
interface PartidoDetalleFd {
  minute?: number | string | null;
  venue?: string | null;
  referees?: Array<{ name?: string | null }>;
  score?: {
    fullTime?: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
  goals?: Array<{
    minute: number | null;
    team?: EquipoRefFd;
    scorer?: { name?: string | null };
    type?: string | null; // REGULAR | PENALTY | OWN
  }>;
  bookings?: Array<{
    minute: number | null;
    team?: EquipoRefFd;
    player?: { name?: string | null };
    card?: string | null; // YELLOW | YELLOW_RED | RED
  }>;
  substitutions?: Array<{
    minute: number | null;
    team?: EquipoRefFd;
    playerOut?: { name?: string | null };
    playerIn?: { name?: string | null };
  }>;
}
interface StandingsFd {
  standings?: Array<{
    type: string; // TOTAL | HOME | AWAY
    group?: string | null;
    table?: Array<{
      position: number;
      team: EquipoRefFd;
      playedGames: number;
      won: number;
      draw: number;
      lost: number;
      points: number;
      goalsFor: number;
      goalsAgainst: number;
    }>;
  }>;
}

interface EntradaCache<T> {
  data: T;
  expira: number;
}

const TTL_VIVO_MS = 60 * 1000;
const TTL_NORMAL_MS = 15 * 60 * 1000;
const TTL_STANDINGS_MS = 60 * 60 * 1000;

@Injectable()
export class EventoDetalleService {
  private readonly logger = new Logger(EventoDetalleService.name);
  private readonly cacheDetalle = new Map<
    string,
    EntradaCache<DetallePartidoResponse>
  >();
  private readonly cacheStandings = new Map<
    string,
    EntradaCache<StandingsFd>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventosService: EventosService,
  ) {}

  async obtener(eventoId: string): Promise<DetallePartidoResponse> {
    const enCache = this.cacheDetalle.get(eventoId);
    if (enCache && enCache.expira > Date.now()) return enCache.data;

    // Base desde NUESTRO catálogo (también valida el 404).
    const evento = await this.eventosService.obtener(eventoId);

    const respuestaBase: DetallePartidoResponse = {
      evento,
      minuto: null,
      marcador: { actual: null, medioTiempo: null },
      cronologia: [],
      ficha: { arbitro: null, estadio: null },
      caminoTorneo: [],
    };

    const fila = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: { metadata: true },
    });
    const fdId = (fila?.metadata as { fdId?: number } | null)?.fdId;
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!fdId || !token) return respuestaBase; // evento del seed o sin token

    // Mapa team fd → participante nuestro (por metadata.fdId).
    const participantes = await this.prisma.eventoParticipante.findMany({
      where: { eventoId },
      include: { participante: true },
    });
    const porFdId = new Map<number, string>();
    for (const p of participantes) {
      const teamFdId = (p.participante.metadata as { fdId?: number } | null)
        ?.fdId;
      if (teamFdId) porFdId.set(teamFdId, p.participanteId);
    }

    const respuesta = { ...respuestaBase };
    try {
      const partido = await this.fetchFd<PartidoDetalleFd>(
        `https://api.football-data.org/v4/matches/${fdId}`,
        token,
      );
      respuesta.minuto =
        partido.minute !== null && partido.minute !== undefined
          ? String(partido.minute)
          : null;
      respuesta.marcador = {
        actual: this.aMarcador(partido.score?.fullTime),
        medioTiempo: this.aMarcador(partido.score?.halfTime),
      };
      respuesta.ficha = {
        arbitro: partido.referees?.[0]?.name ?? null,
        estadio: partido.venue ?? null,
      };
      respuesta.cronologia = this.aCronologia(partido, porFdId);
    } catch (e) {
      // Sin detalle del proveedor la página vive con la base.
      this.logger.warn(`Detalle fd ${fdId} falló: ${String(e)}`);
    }

    try {
      respuesta.caminoTorneo = await this.caminoTorneo(
        evento.competicion.slug,
        porFdId,
        token,
      );
    } catch (e) {
      this.logger.warn(`Standings falló: ${String(e)}`);
    }

    const ttl =
      evento.estado === EstadoEvento.EN_VIVO ? TTL_VIVO_MS : TTL_NORMAL_MS;
    this.cacheDetalle.set(eventoId, { data: respuesta, expira: Date.now() + ttl });
    return respuesta;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private aMarcador(
    score?: { home: number | null; away: number | null } | null,
  ): [number, number] | null {
    return score && score.home !== null && score.away !== null
      ? [score.home, score.away]
      : null;
  }

  /** Goles + tarjetas + cambios en una sola línea de tiempo (reciente primero). */
  private aCronologia(
    partido: PartidoDetalleFd,
    porFdId: Map<number, string>,
  ): MomentoPartido[] {
    const momentos: MomentoPartido[] = [];
    const participanteDe = (team?: EquipoRefFd) =>
      team?.id ? (porFdId.get(team.id) ?? null) : null;

    for (const gol of partido.goals ?? []) {
      momentos.push({
        minuto: gol.minute,
        tipo: 'GOL',
        participanteId: participanteDe(gol.team),
        jugador: gol.scorer?.name ?? null,
        detalle:
          gol.type === 'PENALTY'
            ? 'Penal'
            : gol.type === 'OWN'
              ? 'Autogol'
              : null,
      });
    }
    for (const tarjeta of partido.bookings ?? []) {
      momentos.push({
        minuto: tarjeta.minute,
        tipo: tarjeta.card === 'YELLOW' ? 'TARJETA_AMARILLA' : 'TARJETA_ROJA',
        participanteId: participanteDe(tarjeta.team),
        jugador: tarjeta.player?.name ?? null,
        detalle: tarjeta.card === 'YELLOW_RED' ? 'Segunda amarilla' : null,
      });
    }
    for (const cambio of partido.substitutions ?? []) {
      momentos.push({
        minuto: cambio.minute,
        tipo: 'CAMBIO',
        participanteId: participanteDe(cambio.team),
        jugador: cambio.playerIn?.name ?? null,
        detalle: cambio.playerOut?.name
          ? `Sale ${cambio.playerOut.name}`
          : null,
      });
    }

    return momentos.sort((a, b) => (b.minuto ?? 0) - (a.minuto ?? 0));
  }

  /** Standing de los equipos del partido (caché 1h por competición). */
  private async caminoTorneo(
    slugCompeticion: string,
    porFdId: Map<number, string>,
    token: string,
  ): Promise<FilaCaminoTorneo[]> {
    const codigo = this.codigoDeCompeticion(slugCompeticion);
    if (!codigo || porFdId.size === 0) return [];

    let standings = this.cacheStandings.get(codigo);
    if (!standings || standings.expira <= Date.now()) {
      const data = await this.fetchFd<StandingsFd>(
        `https://api.football-data.org/v4/competitions/${codigo}/standings`,
        token,
      );
      standings = { data, expira: Date.now() + TTL_STANDINGS_MS };
      this.cacheStandings.set(codigo, standings);
    }

    const filas: FilaCaminoTorneo[] = [];
    for (const bloque of standings.data.standings ?? []) {
      if (bloque.type !== 'TOTAL') continue;
      for (const fila of bloque.table ?? []) {
        const participanteId = fila.team.id
          ? porFdId.get(fila.team.id)
          : undefined;
        if (!participanteId) continue;
        filas.push({
          participanteId,
          grupo: bloque.group?.replace('GROUP_', 'Grupo ') ?? null,
          posicion: fila.position,
          pj: fila.playedGames,
          g: fila.won,
          e: fila.draw,
          p: fila.lost,
          gf: fila.goalsFor,
          gc: fila.goalsAgainst,
          puntos: fila.points,
        });
      }
    }
    return filas;
  }

  private async fetchFd<T>(url: string, token: string): Promise<T> {
    const res = await fetch(url, { headers: { 'X-Auth-Token': token } });
    if (!res.ok) throw new Error(`football-data HTTP ${res.status}`);
    return (await res.json()) as T;
  }

  private codigoDeCompeticion(slug: string): string | null {
    try {
      const crudo = readFileSync(
        join(process.cwd(), 'config', 'competiciones-sync.json'),
        'utf8',
      );
      const json = JSON.parse(crudo) as Array<{ codigo?: string; slug?: string }>;
      return json.find((c) => c.slug === slug)?.codigo ?? null;
    } catch {
      return null;
    }
  }
}
