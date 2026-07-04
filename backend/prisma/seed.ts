/**
 * SEED — datos de prueba del Vertical Slice (ejecutar: `npm run seed`).
 *
 * Crea (idempotente — se puede re-ejecutar sin duplicar nada):
 *  - 2 deportes con FORMATOS distintos: Fútbol (EQUIPOS) y Fórmula 1 (MULTITUDINARIO)
 *    → demuestra que la jerarquía abstracta soporta ambos sin cambios de schema.
 *  - Competición + temporada + evento PROGRAMADO por deporte, con participantes.
 *  - 2 usuarios: "demo" (con pronósticos sembrados) y "tester" (limpio, para smoke tests).
 *  - Bono de 500 tickets a cada usuario (doble entrada: DEBITO TESORERIA / CREDITO usuario).
 *  - 2 PRONÓSTICOS DE MODALIDADES DISTINTAS para el usuario demo:
 *      · MARCADOR_EXACTO sobre el partido de fútbol  → payload {"marcador":[2,1]}
 *      · PODIO sobre el GP de F1                     → payload {"podio":[...]}
 *    Cada uno con su cobro correspondiente en el Ledger (misma clave de
 *    idempotencia que usaría la API: PRONOSTICO:{usuarioId}:{eventoId}:{tipo}).
 *
 * Los IDs son deterministas (UUID v4 fijos) para que los smoke tests puedan
 * referenciarlos sin parsear la salida del seed.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DireccionAsiento,
  EstadoEvento,
  EstadoTemporada,
  FormatoDeporte,
  ModuloSistema,
  MotivoTransaccion,
  PrismaClient,
  RolEvento,
  TipoCompeticion,
  TipoLedgerAccount,
  TipoParticipante,
} from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// ---------------------------------------------------------------------------
// IDs deterministas (compartidos con scripts/smoke-tests.mjs)
// ---------------------------------------------------------------------------
export const IDS = {
  USUARIO_DEMO: '00000000-0000-4000-8000-000000000001',
  USUARIO_TESTER: '00000000-0000-4000-8000-000000000002',
  TEMPORADA_LIGA: '00000000-0000-4000-8000-0000000000a1',
  TEMPORADA_F1: '00000000-0000-4000-8000-0000000000a2',
  EVENTO_CLASICO: '00000000-0000-4000-8000-0000000000e1',
  EVENTO_GP: '00000000-0000-4000-8000-0000000000e2',
  // Eventos extra (doc 08): llenan el carrusel del Home.
  EVENTO_J2: '00000000-0000-4000-8000-0000000000e3',
  EVENTO_J3: '00000000-0000-4000-8000-0000000000e4',
  EVENTO_GP2: '00000000-0000-4000-8000-0000000000e5',
} as const;

const BONO_INICIAL = 500;

/**
 * Registra un movimiento de tickets respetando la doble entrada del ledger.
 * Idempotente por clave: si la transacción ya existe, no hace nada.
 * (El seed escribe directo con Prisma porque corre fuera de NestJS; en la app,
 * el único escritor sigue siendo LedgerService.)
 */
async function movimientoLedger(opts: {
  idempotencyKey: string;
  modulo: ModuloSistema;
  motivo: MotivoTransaccion;
  descripcion: string;
  referencia?: { tipo: string; id: string };
  desde: { codigo: string; tipo: TipoLedgerAccount } | { usuarioId: string };
  hacia: { codigo: string; tipo: TipoLedgerAccount } | { usuarioId: string };
  cantidad: number;
}): Promise<void> {
  const existente = await prisma.ledgerTransaction.findUnique({
    where: { idempotencyKey: opts.idempotencyKey },
  });
  if (existente) return; // ya sembrado

  const cuentaId = async (
    ref: { codigo: string; tipo: TipoLedgerAccount } | { usuarioId: string },
  ): Promise<string> => {
    if ('usuarioId' in ref) {
      const c = await prisma.ledgerAccount.upsert({
        where: { usuarioId: ref.usuarioId },
        update: {},
        create: { tipo: TipoLedgerAccount.USUARIO, usuarioId: ref.usuarioId },
      });
      return c.id;
    }
    const c = await prisma.ledgerAccount.upsert({
      where: { codigo: ref.codigo },
      update: {},
      create: { tipo: ref.tipo, codigo: ref.codigo },
    });
    return c.id;
  };

  const [desdeId, haciaId] = [await cuentaId(opts.desde), await cuentaId(opts.hacia)];

  await prisma.ledgerTransaction.create({
    data: {
      modulo: opts.modulo,
      motivo: opts.motivo,
      descripcion: opts.descripcion,
      referenciaTipo: opts.referencia?.tipo ?? null,
      referenciaId: opts.referencia?.id ?? null,
      idempotencyKey: opts.idempotencyKey,
      asientos: {
        create: [
          // Doble entrada: mismo monto sale de una cuenta y entra en la otra.
          { cuentaId: desdeId, direccion: DireccionAsiento.DEBITO, cantidad: opts.cantidad },
          { cuentaId: haciaId, direccion: DireccionAsiento.CREDITO, cantidad: opts.cantidad },
        ],
      },
    },
  });
}

/** Siembra una predicción + su cobro, con la MISMA semántica que la API. */
async function sembrarPrediccion(opts: {
  usuarioId: string;
  eventoId: string;
  tipo: string;
  payload: object;
  costoTickets: number;
  descripcion: string;
}): Promise<void> {
  const prediccion = await prisma.prediccion.upsert({
    where: {
      usuarioId_eventoId_tipo: {
        usuarioId: opts.usuarioId,
        eventoId: opts.eventoId,
        tipo: opts.tipo,
      },
    },
    update: {},
    create: {
      usuarioId: opts.usuarioId,
      eventoId: opts.eventoId,
      tipo: opts.tipo,
      payload: opts.payload,
      costoTickets: opts.costoTickets,
    },
  });

  await movimientoLedger({
    idempotencyKey: `PRONOSTICO:${opts.usuarioId}:${opts.eventoId}:${opts.tipo}`,
    modulo: ModuloSistema.PRONOSTICOS,
    motivo: MotivoTransaccion.PAGO,
    descripcion: opts.descripcion,
    referencia: { tipo: 'PRONOSTICO', id: prediccion.id },
    desde: { usuarioId: opts.usuarioId },
    hacia: { codigo: 'REDENCION', tipo: TipoLedgerAccount.REDENCION },
    cantidad: opts.costoTickets,
  });
}

async function main(): Promise<void> {
  // ------------------------------------------------------------------
  // 1. Dominio deportivo: FÚTBOL (formato EQUIPOS)
  // ------------------------------------------------------------------
  const futbol = await prisma.deporte.upsert({
    where: { slug: 'futbol' },
    update: {},
    create: {
      slug: 'futbol',
      nombre: 'Fútbol',
      formato: FormatoDeporte.EQUIPOS,
      metadata: { duracionMin: 90, jugadoresPorEquipo: 11 },
    },
  });

  const laLiga = await prisma.competicion.upsert({
    where: { slug: 'laliga' },
    update: {},
    create: {
      deporteId: futbol.id,
      slug: 'laliga',
      nombre: 'LaLiga',
      tipo: TipoCompeticion.LIGA,
      metadata: { pais: 'España' },
    },
  });

  await prisma.temporada.upsert({
    where: { id: IDS.TEMPORADA_LIGA },
    update: {},
    create: {
      id: IDS.TEMPORADA_LIGA,
      competicionId: laLiga.id,
      nombre: '2026/27',
      fechaInicio: new Date('2026-08-15T00:00:00Z'),
      estado: EstadoTemporada.EN_CURSO,
    },
  });

  const [madrid, barsa] = await Promise.all(
    [
      { slug: 'real-madrid', nombre: 'Real Madrid' },
      { slug: 'fc-barcelona', nombre: 'FC Barcelona' },
    ].map((e) =>
      prisma.participante.upsert({
        where: { slug: e.slug },
        update: {},
        create: {
          deporteId: futbol.id,
          slug: e.slug,
          nombre: e.nombre,
          tipo: TipoParticipante.EQUIPO,
        },
      }),
    ),
  );

  await prisma.evento.upsert({
    where: { id: IDS.EVENTO_CLASICO },
    update: {},
    create: {
      id: IDS.EVENTO_CLASICO,
      temporadaId: IDS.TEMPORADA_LIGA,
      nombre: 'Jornada 1: Real Madrid vs FC Barcelona',
      fase: 'Jornada 1',
      fechaInicio: new Date('2026-08-16T19:00:00Z'),
      estado: EstadoEvento.PROGRAMADO,
      participantes: {
        create: [
          { participanteId: madrid.id, rol: RolEvento.LOCAL },
          { participanteId: barsa.id, rol: RolEvento.VISITANTE },
        ],
      },
    },
  });

  // Eventos extra de fútbol (doc 08): más contenido para el carrusel del Home.
  // Reutilizan a Madrid/Barsa invirtiendo la localía — suficiente para la demo.
  const [atletico, sevilla] = await Promise.all(
    [
      { slug: 'atletico-madrid', nombre: 'Atlético de Madrid' },
      { slug: 'sevilla-fc', nombre: 'Sevilla FC' },
    ].map((e) =>
      prisma.participante.upsert({
        where: { slug: e.slug },
        update: {},
        create: {
          deporteId: futbol.id,
          slug: e.slug,
          nombre: e.nombre,
          tipo: TipoParticipante.EQUIPO,
        },
      }),
    ),
  );

  for (const evento of [
    {
      id: IDS.EVENTO_J2,
      nombre: 'Jornada 2: Atlético de Madrid vs Real Madrid',
      fase: 'Jornada 2',
      fechaInicio: new Date('2026-08-23T17:00:00Z'),
      local: atletico.id,
      visitante: madrid.id,
    },
    {
      id: IDS.EVENTO_J3,
      nombre: 'Jornada 3: FC Barcelona vs Sevilla FC',
      fase: 'Jornada 3',
      fechaInicio: new Date('2026-08-30T19:00:00Z'),
      local: barsa.id,
      visitante: sevilla.id,
    },
  ]) {
    await prisma.evento.upsert({
      where: { id: evento.id },
      update: {},
      create: {
        id: evento.id,
        temporadaId: IDS.TEMPORADA_LIGA,
        nombre: evento.nombre,
        fase: evento.fase,
        fechaInicio: evento.fechaInicio,
        estado: EstadoEvento.PROGRAMADO,
        participantes: {
          create: [
            { participanteId: evento.local, rol: RolEvento.LOCAL },
            { participanteId: evento.visitante, rol: RolEvento.VISITANTE },
          ],
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 2. Dominio deportivo: FÓRMULA 1 (formato MULTITUDINARIO)
  // ------------------------------------------------------------------
  const f1 = await prisma.deporte.upsert({
    where: { slug: 'formula-1' },
    update: {},
    create: {
      slug: 'formula-1',
      nombre: 'Fórmula 1',
      formato: FormatoDeporte.MULTITUDINARIO,
      metadata: { puntosPorPosicion: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] },
    },
  });

  const mundialF1 = await prisma.competicion.upsert({
    where: { slug: 'mundial-f1' },
    update: {},
    create: {
      deporteId: f1.id,
      slug: 'mundial-f1',
      nombre: 'Campeonato Mundial de F1',
      tipo: TipoCompeticion.CAMPEONATO,
    },
  });

  await prisma.temporada.upsert({
    where: { id: IDS.TEMPORADA_F1 },
    update: {},
    create: {
      id: IDS.TEMPORADA_F1,
      competicionId: mundialF1.id,
      nombre: 'Temporada 2026',
      fechaInicio: new Date('2026-03-01T00:00:00Z'),
      estado: EstadoTemporada.EN_CURSO,
    },
  });

  const pilotos = await Promise.all(
    [
      { slug: 'piloto-verstappen', nombre: 'Max Verstappen' },
      { slug: 'piloto-leclerc', nombre: 'Charles Leclerc' },
      { slug: 'piloto-norris', nombre: 'Lando Norris' },
    ].map((p) =>
      prisma.participante.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          deporteId: f1.id,
          slug: p.slug,
          nombre: p.nombre,
          tipo: TipoParticipante.PILOTO,
        },
      }),
    ),
  );

  await prisma.evento.upsert({
    where: { id: IDS.EVENTO_GP },
    update: {},
    create: {
      id: IDS.EVENTO_GP,
      temporadaId: IDS.TEMPORADA_F1,
      nombre: 'Gran Premio de Mónaco',
      fase: 'Ronda 8',
      fechaInicio: new Date('2026-08-23T13:00:00Z'),
      estado: EstadoEvento.PROGRAMADO,
      participantes: {
        create: pilotos.map((p) => ({
          participanteId: p.id,
          rol: RolEvento.COMPETIDOR,
        })),
      },
    },
  });

  // GP extra (doc 08): segundo evento MULTITUDINARIO para el carrusel.
  await prisma.evento.upsert({
    where: { id: IDS.EVENTO_GP2 },
    update: {},
    create: {
      id: IDS.EVENTO_GP2,
      temporadaId: IDS.TEMPORADA_F1,
      nombre: 'Gran Premio de Italia',
      fase: 'Ronda 9',
      fechaInicio: new Date('2026-09-06T13:00:00Z'),
      estado: EstadoEvento.PROGRAMADO,
      participantes: {
        create: pilotos.map((p) => ({
          participanteId: p.id,
          rol: RolEvento.COMPETIDOR,
        })),
      },
    },
  });

  // ------------------------------------------------------------------
  // 3. Usuarios + bono inicial de tickets (emisión desde TESORERIA)
  // ------------------------------------------------------------------
  // Credenciales de los usuarios del seed: password "demo1234" (bcrypt, costo 10).
  // Hash precalculado para que el seed no dependa de bcryptjs y siga siendo
  // determinista. Permite iniciar sesión en la app desplegada (07_modulo_users_jwt.md).
  const PASSWORD_HASH_DEMO =
    '$2b$10$uXIJD9FpSQv8OmPVlKBsfecUELP0kg/XloDuNssBgmusqWGy6RtU2';
  for (const [id, email, nombre] of [
    [IDS.USUARIO_DEMO, 'demo@app-deportivo.test', 'Usuario Demo'],
    [IDS.USUARIO_TESTER, 'tester@app-deportivo.test', 'Usuario Tester'],
  ] as const) {
    await prisma.usuario.upsert({
      where: { id },
      // update también fija el hash: los usuarios ya sembrados en producción
      // (pre-auth) reciben su contraseña en el próximo re-seed.
      update: { passwordHash: PASSWORD_HASH_DEMO },
      create: { id, email, nombre, passwordHash: PASSWORD_HASH_DEMO },
    });
    await movimientoLedger({
      idempotencyKey: `SEED:BONO_REGISTRO:${id}`,
      modulo: ModuloSistema.USUARIOS,
      motivo: MotivoTransaccion.BONO,
      descripcion: 'Bono de bienvenida (seed)',
      desde: { codigo: 'TESORERIA', tipo: TipoLedgerAccount.TESORERIA },
      hacia: { usuarioId: id },
      cantidad: BONO_INICIAL,
    });
  }

  // ------------------------------------------------------------------
  // 4. DOS PRONÓSTICOS DE MODALIDADES DISTINTAS (usuario demo)
  //    Demuestran que tipo + payload Json absorben deportes y desafíos
  //    heterogéneos sin cambios de schema.
  // ------------------------------------------------------------------
  await sembrarPrediccion({
    usuarioId: IDS.USUARIO_DEMO,
    eventoId: IDS.EVENTO_CLASICO,
    tipo: 'MARCADOR_EXACTO',
    payload: { marcador: [2, 1] }, // local 2 - 1 visitante
    costoTickets: 50,
    descripcion: 'Pronóstico MARCADOR_EXACTO — Real Madrid vs FC Barcelona',
  });

  await sembrarPrediccion({
    usuarioId: IDS.USUARIO_DEMO,
    eventoId: IDS.EVENTO_GP,
    tipo: 'PODIO',
    payload: { podio: pilotos.map((p) => p.id) }, // 1º, 2º y 3º pronosticados
    costoTickets: 30,
    descripcion: 'Pronóstico PODIO — Gran Premio de Mónaco',
  });

  // ------------------------------------------------------------------
  // Resumen
  // ------------------------------------------------------------------
  const predicciones = await prisma.prediccion.findMany({
    where: { usuarioId: IDS.USUARIO_DEMO },
    select: { tipo: true, payload: true, costoTickets: true, estado: true },
  });
  console.log('✔ Seed completado');
  console.log(`  Usuario demo:   ${IDS.USUARIO_DEMO}`);
  console.log(`  Usuario tester: ${IDS.USUARIO_TESTER} (limpio, para smoke tests)`);
  console.log(`  Evento fútbol:  ${IDS.EVENTO_CLASICO}`);
  console.log(`  Evento F1:      ${IDS.EVENTO_GP}`);
  console.log('  Pronósticos sembrados (demo):');
  for (const p of predicciones) {
    console.log(`   - [${p.tipo}] costo=${p.costoTickets} estado=${p.estado} payload=${JSON.stringify(p.payload)}`);
  }
}

main()
  .catch((e) => {
    console.error('✘ Seed falló:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
