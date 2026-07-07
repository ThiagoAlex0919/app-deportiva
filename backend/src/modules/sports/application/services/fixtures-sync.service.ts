/**
 * FixturesSyncService — partidos REALES desde football-data.org (doc 12).
 *
 * Mismo patrón probado del agregador RSS: refresco on-demand con caché de
 * 30 min (disparado por GET /sports/events), fallos por competición se
 * loguean y se ignoran, upserts idempotentes con ids DETERMINISTAS
 * derivados de los ids del proveedor.
 *
 * Cierre del loop del producto: cuando el sync detecta un partido FINISHED,
 * guarda marcador + posiciones e invoca al ORÁCULO automáticamente —
 * las recompensas se pagan sin intervención manual.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  EstadoEvento,
  EstadoTemporada,
  FormatoDeporte,
  Prisma,
  RolEvento,
  TipoCompeticion,
  TipoParticipante,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { OraculoService } from '../../../gamification/application/services/oraculo.service';

/** Competición declarada en config/competiciones-sync.json. */
interface CompeticionSync {
  codigo: string; // código football-data: WC, PD, CL...
  slug: string;
  nombre: string;
  tipo?: string;
}

/** Subconjunto que usamos de la respuesta /v4/competitions/{code}/matches. */
interface PartidoFd {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string | null;
  homeTeam: EquipoFd;
  awayTeam: EquipoFd;
  score: { winner: string | null; fullTime: { home: number | null; away: number | null } };
  season: { id: number; startDate: string };
}
interface EquipoFd {
  id: number | null;
  name: string | null;
  shortName: string | null;
  crest: string | null;
}

const CACHE_MS = 30 * 60 * 1000; // 30 min — sobra para 10 req/min del free tier
const VENTANA_ATRAS_DIAS = 2; // detectar FINISHED recientes (dispara el oráculo)
const VENTANA_ADELANTE_DIAS = 14;

/** football-data status → nuestro EstadoEvento. */
const MAPA_ESTADOS: Record<string, EstadoEvento> = {
  SCHEDULED: EstadoEvento.PROGRAMADO,
  TIMED: EstadoEvento.PROGRAMADO,
  IN_PLAY: EstadoEvento.EN_VIVO,
  PAUSED: EstadoEvento.EN_VIVO,
  FINISHED: EstadoEvento.FINALIZADO,
  POSTPONED: EstadoEvento.POSPUESTO,
  SUSPENDED: EstadoEvento.POSPUESTO,
  CANCELLED: EstadoEvento.CANCELADO,
};

@Injectable()
export class FixturesSyncService {
  private readonly logger = new Logger(FixturesSyncService.name);
  private ultimaSync = 0;
  private syncEnCurso: Promise<void> | null = null;
  private avisoSinToken = false;

  constructor(
    private readonly prisma: PrismaService,
    // Fachada exportada por GamificationModule (regla del monolito modular).
    private readonly oraculoService: OraculoService,
  ) {}

  /** Punto de entrada: lo llama EventosService antes de listar. */
  async sincronizarSiVencio(): Promise<void> {
    if (Date.now() - this.ultimaSync < CACHE_MS) return;
    this.syncEnCurso ??= this.sincronizar().finally(() => {
      this.syncEnCurso = null;
    });
    await this.syncEnCurso;
  }

  private async sincronizar(): Promise<void> {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) {
      // Sin token el catálogo sigue funcionando (seed); avisar UNA vez.
      if (!this.avisoSinToken) {
        this.logger.warn(
          'FOOTBALL_DATA_TOKEN no configurado — sync de fixtures reales deshabilitado',
        );
        this.avisoSinToken = true;
      }
      this.ultimaSync = Date.now();
      return;
    }

    const competiciones = this.cargarConfig();
    for (const comp of competiciones) {
      try {
        await this.sincronizarCompeticion(comp, token);
      } catch (e) {
        // Una competición caída jamás tumba el catálogo.
        this.logger.warn(`Sync de "${comp.codigo}" falló: ${String(e)}`);
      }
    }
    this.ultimaSync = Date.now();
  }

  private async sincronizarCompeticion(
    comp: CompeticionSync,
    token: string,
  ): Promise<void> {
    const desde = this.fechaISO(-VENTANA_ATRAS_DIAS);
    const hasta = this.fechaISO(VENTANA_ADELANTE_DIAS);
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${comp.codigo}/matches?dateFrom=${desde}&dateTo=${hasta}`,
      { headers: { 'X-Auth-Token': token } },
    );
    if (!res.ok) throw new Error(`football-data HTTP ${res.status}`);
    const data = (await res.json()) as { matches?: PartidoFd[] };
    const partidos = data.matches ?? [];
    if (partidos.length === 0) return;

    // 1. Deporte + Competición + Temporada (upserts baratos, idempotentes).
    const futbol = await this.prisma.deporte.upsert({
      where: { slug: 'futbol' },
      update: {},
      create: {
        slug: 'futbol',
        nombre: 'Fútbol',
        formato: FormatoDeporte.EQUIPOS,
      },
    });
    const competicion = await this.prisma.competicion.upsert({
      where: { slug: comp.slug },
      update: {},
      create: {
        deporteId: futbol.id,
        slug: comp.slug,
        nombre: comp.nombre,
        tipo: this.aTipo(comp.tipo),
      },
    });
    const temporadaId = this.uuidDeterminista(
      `fd-season-${comp.codigo}-${partidos[0].season.id}`,
    );
    await this.prisma.temporada.upsert({
      where: { id: temporadaId },
      update: {},
      create: {
        id: temporadaId,
        competicionId: competicion.id,
        nombre: `${comp.nombre} ${partidos[0].season.startDate.slice(0, 4)}`,
        fechaInicio: new Date(partidos[0].season.startDate),
        estado: EstadoTemporada.EN_CURSO,
      },
    });

    // 2. Partidos.
    let nuevos = 0;
    let oraculos = 0;
    for (const partido of partidos) {
      const resultado = await this.sincronizarPartido(
        partido,
        futbol.id,
        temporadaId,
      );
      if (resultado === 'creado') nuevos += 1;
      if (resultado === 'resuelto') oraculos += 1;
    }
    this.logger.log(
      `Sync ${comp.codigo}: ${partidos.length} partidos (${nuevos} nuevos, ${oraculos} resueltos por el oráculo)`,
    );
  }

  private async sincronizarPartido(
    partido: PartidoFd,
    deporteId: string,
    temporadaId: string,
  ): Promise<'creado' | 'actualizado' | 'resuelto'> {
    if (!partido.homeTeam?.id || !partido.awayTeam?.id) return 'actualizado';

    const eventoId = this.uuidDeterminista(`fd-match-${partido.id}`);
    const estado = MAPA_ESTADOS[partido.status] ?? EstadoEvento.PROGRAMADO;
    const nombre = `${partido.homeTeam.shortName ?? partido.homeTeam.name} vs ${partido.awayTeam.shortName ?? partido.awayTeam.name}`;
    const fase =
      partido.matchday !== null
        ? `Jornada ${partido.matchday}`
        : (partido.stage?.replaceAll('_', ' ') ?? null);

    const [local, visitante] = await Promise.all([
      this.upsertEquipo(partido.homeTeam, deporteId),
      this.upsertEquipo(partido.awayTeam, deporteId),
    ]);

    const marcador =
      partido.score.fullTime.home !== null &&
      partido.score.fullTime.away !== null
        ? [partido.score.fullTime.home, partido.score.fullTime.away]
        : null;

    const existente = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: { estado: true },
    });

    await this.prisma.evento.upsert({
      where: { id: eventoId },
      // Los partidos reales SÍ se actualizan (fecha, estado, marcador):
      // el proveedor es la fuente de verdad de su ciclo de vida.
      update: {
        estado,
        fechaInicio: new Date(partido.utcDate),
        ...(marcador
          ? { resultado: { marcador } as Prisma.InputJsonValue }
          : {}),
      },
      create: {
        id: eventoId,
        temporadaId,
        nombre,
        fase,
        fechaInicio: new Date(partido.utcDate),
        estado,
        ...(marcador
          ? { resultado: { marcador } as Prisma.InputJsonValue }
          : {}),
        metadata: { fdId: partido.id } as Prisma.InputJsonValue,
        participantes: {
          create: [
            { participanteId: local, rol: RolEvento.LOCAL },
            { participanteId: visitante, rol: RolEvento.VISITANTE },
          ],
        },
      },
    });

    // Transición a estado terminal detectada → posiciones + ORÁCULO.
    const esTerminal =
      estado === EstadoEvento.FINALIZADO ||
      estado === EstadoEvento.POSPUESTO ||
      estado === EstadoEvento.CANCELADO;
    const cambioAEstadoTerminal = esTerminal && existente?.estado !== estado;

    if (cambioAEstadoTerminal) {
      if (estado === EstadoEvento.FINALIZADO && marcador) {
        // posicionFinal 1/2 para la modalidad GANADOR (empate: sin posiciones).
        const [golesLocal, golesVisitante] = marcador;
        if (golesLocal !== golesVisitante) {
          const ganadorId = golesLocal > golesVisitante ? local : visitante;
          const perdedorId = golesLocal > golesVisitante ? visitante : local;
          await this.prisma.eventoParticipante.updateMany({
            where: { eventoId, participanteId: ganadorId },
            data: { posicionFinal: 1 },
          });
          await this.prisma.eventoParticipante.updateMany({
            where: { eventoId, participanteId: perdedorId },
            data: { posicionFinal: 2 },
          });
        }
      }
      // El oráculo resuelve (FINALIZADO) o anula (POSPUESTO/CANCELADO).
      try {
        await this.oraculoService.resolverEvento(eventoId);
        return 'resuelto';
      } catch (e) {
        this.logger.warn(`Oráculo falló para ${eventoId}: ${String(e)}`);
      }
    }

    return existente ? 'actualizado' : 'creado';
  }

  /** Upsert de equipo por slug determinista; guarda el escudo en metadata. */
  private async upsertEquipo(
    equipo: EquipoFd,
    deporteId: string,
  ): Promise<string> {
    const slug = `fd-${equipo.id}`;
    const participante = await this.prisma.participante.upsert({
      where: { slug },
      // El escudo puede cambiar de CDN: mantenerlo fresco.
      update: equipo.crest
        ? { metadata: { crest: equipo.crest, fdId: equipo.id } }
        : {},
      create: {
        deporteId,
        slug,
        nombre: equipo.shortName ?? equipo.name ?? `Equipo ${equipo.id}`,
        tipo: TipoParticipante.EQUIPO,
        metadata: { crest: equipo.crest, fdId: equipo.id } as Prisma.InputJsonValue,
      },
    });
    return participante.id;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  /**
   * UUID v4-compatible DETERMINISTA desde una semilla (md5 con los bits de
   * versión/variante forzados). Mismo partido del proveedor → mismo Evento
   * nuestro, siempre — la clave de la idempotencia del sync.
   */
  private uuidDeterminista(semilla: string): string {
    const h = createHash('md5').update(semilla).digest('hex');
    const variante = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variante}${h.slice(17, 20)}-${h.slice(20, 32)}`;
  }

  private fechaISO(offsetDias: number): string {
    const d = new Date(Date.now() + offsetDias * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }

  private aTipo(tipo?: string): TipoCompeticion {
    return (Object.values(TipoCompeticion) as string[]).includes(tipo ?? '')
      ? (tipo as TipoCompeticion)
      : TipoCompeticion.LIGA;
  }

  private cargarConfig(): CompeticionSync[] {
    try {
      const crudo = readFileSync(
        join(process.cwd(), 'config', 'competiciones-sync.json'),
        'utf8',
      );
      const json = JSON.parse(crudo) as unknown;
      if (!Array.isArray(json)) return [];
      return json.filter(
        (c): c is CompeticionSync =>
          typeof c === 'object' &&
          c !== null &&
          typeof (c as CompeticionSync).codigo === 'string' &&
          typeof (c as CompeticionSync).slug === 'string',
      );
    } catch {
      this.logger.error(
        'config/competiciones-sync.json ilegible — sync sin competiciones',
      );
      return [];
    }
  }
}
