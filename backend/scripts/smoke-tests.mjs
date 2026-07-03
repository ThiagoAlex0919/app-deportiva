/**
 * SMOKE TESTS del Vertical Slice (ejecutar: `npm run smoke`).
 *
 * Prerrequisitos: BD migrada, `npm run seed` ejecutado y API corriendo
 * (`npm run start:dev`). Configurable con API_URL (default localhost:3000).
 *
 * Qué demuestra:
 *  1. Saldo derivado del ledger (GET /ledger/balance).
 *  2. DOS MODALIDADES de pronóstico distintas contra deportes distintos:
 *       · MARCADOR_EXACTO (fútbol)  payload {"marcador":[1,1]}
 *       · PODIO (Fórmula 1)         payload {"podio":[...]}
 *     → el schema (tipo + payload Json) las absorbe sin romperse.
 *  3. Idempotencia: repetir una modalidad NO cobra dos veces (yaExistia=true).
 *  4. Doble entrada: el saldo baja exactamente costoA + costoB.
 *  5. Historial con los movimientos correspondientes.
 *  6. Errores de negocio: SALDO_INSUFICIENTE (409) y MODALIDAD_NO_SOPORTADA (422).
 *
 * Re-ejecutable: usa deltas de saldo y tolera pronósticos ya creados en
 * corridas anteriores (los pasos 2-3 se vuelven asserts de idempotencia).
 */

const BASE = process.env.API_URL ?? 'http://localhost:3000/api/v1';

// IDs deterministas — deben coincidir con prisma/seed.ts
const USUARIO_TESTER = '00000000-0000-4000-8000-000000000002';
const EVENTO_CLASICO = '00000000-0000-4000-8000-0000000000e1';
const EVENTO_GP = '00000000-0000-4000-8000-0000000000e2';

const COSTO_MARCADOR = 50;
const COSTO_PODIO = 30;

let fallos = 0;
function check(ok, mensaje, detalle = '') {
  console.log(`${ok ? '  ✔' : '  ✘'} ${mensaje}${ok || !detalle ? '' : ` — ${detalle}`}`);
  if (!ok) fallos++;
}

async function get(ruta) {
  const res = await fetch(`${BASE}${ruta}`);
  return { status: res.status, body: await res.json() };
}

async function post(ruta, data) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

const prediccion = (extra) => ({
  usuarioId: USUARIO_TESTER,
  ...extra,
});

console.log(`Smoke tests contra ${BASE}\n`);

// ---------------------------------------------------------------------------
// 1. Saldo inicial (derivado del ledger)
// ---------------------------------------------------------------------------
console.log('1. GET /ledger/balance');
const saldo0 = await get(`/ledger/balance?usuarioId=${USUARIO_TESTER}`);
check(saldo0.status === 200, 'responde 200', `status=${saldo0.status}`);
check(Number.isInteger(saldo0.body.saldo), 'saldo es un entero', JSON.stringify(saldo0.body));
console.log(`     saldo inicial = ${saldo0.body.saldo}`);

// ---------------------------------------------------------------------------
// 2. Modalidad 1: MARCADOR_EXACTO sobre el partido de fútbol
// ---------------------------------------------------------------------------
console.log('2. POST /gamification/predictions [MARCADOR_EXACTO, fútbol]');
const p1 = await post('/gamification/predictions', prediccion({
  eventoId: EVENTO_CLASICO,
  tipo: 'MARCADOR_EXACTO',
  payload: { marcador: [1, 1] },
  costoTickets: COSTO_MARCADOR,
}));
check(p1.status === 201, 'responde 201', `status=${p1.status} body=${JSON.stringify(p1.body)}`);
check(p1.body.tipo === 'MARCADOR_EXACTO', 'modalidad correcta');
check(!!p1.body.ledgerTransactionId, 'cobro registrado en el ledger');
const p1Nueva = p1.body.yaExistia === false; // false en la 1ª corrida, true al re-ejecutar

// ---------------------------------------------------------------------------
// 3. Modalidad 2: PODIO sobre el GP de F1 (payload con OTRA estructura)
// ---------------------------------------------------------------------------
console.log('3. POST /gamification/predictions [PODIO, Fórmula 1]');
const p2 = await post('/gamification/predictions', prediccion({
  eventoId: EVENTO_GP,
  tipo: 'PODIO',
  payload: { podio: ['ver', 'lec', 'nor'] },
  costoTickets: COSTO_PODIO,
}));
check(p2.status === 201, 'responde 201', `status=${p2.status} body=${JSON.stringify(p2.body)}`);
check(p2.body.tipo === 'PODIO', 'modalidad correcta');
check(p2.body.prediccionId !== p1.body.prediccionId, 'son dos predicciones distintas');
const p2Nueva = p2.body.yaExistia === false;

// ---------------------------------------------------------------------------
// 4. Idempotencia: repetir la modalidad 1 NO cobra dos veces
// ---------------------------------------------------------------------------
console.log('4. Reintento del MARCADOR_EXACTO (idempotencia)');
const p1bis = await post('/gamification/predictions', prediccion({
  eventoId: EVENTO_CLASICO,
  tipo: 'MARCADOR_EXACTO',
  payload: { marcador: [1, 1] },
  costoTickets: COSTO_MARCADOR,
}));
check(p1bis.body.yaExistia === true, 'yaExistia=true', JSON.stringify(p1bis.body));
check(p1bis.body.prediccionId === p1.body.prediccionId, 'misma predicción');
check(p1bis.body.ledgerTransactionId === p1.body.ledgerTransactionId, 'misma transacción del ledger');

// ---------------------------------------------------------------------------
// 5. El saldo bajó EXACTAMENTE lo cobrado (doble entrada, sin dobles cobros)
// ---------------------------------------------------------------------------
console.log('5. GET /ledger/balance (verificación de deltas)');
const saldo1 = await get(`/ledger/balance?usuarioId=${USUARIO_TESTER}`);
const deltaEsperado = (p1Nueva ? COSTO_MARCADOR : 0) + (p2Nueva ? COSTO_PODIO : 0);
check(
  saldo1.body.saldo === saldo0.body.saldo - deltaEsperado,
  `saldo bajó exactamente ${deltaEsperado} (${saldo0.body.saldo} → ${saldo1.body.saldo})`,
  `esperado=${saldo0.body.saldo - deltaEsperado}, real=${saldo1.body.saldo}`,
);

// ---------------------------------------------------------------------------
// 6. Historial de billetera
// ---------------------------------------------------------------------------
console.log('6. GET /ledger/history');
const hist = await get(`/ledger/history?usuarioId=${USUARIO_TESTER}&limit=10`);
check(hist.status === 200, 'responde 200');
check(Array.isArray(hist.body.movimientos) && hist.body.movimientos.length >= 3,
  `contiene bono + 2 cobros (${hist.body.movimientos?.length} movimientos)`);
const modulos = new Set(hist.body.movimientos.map((m) => m.modulo));
check(modulos.has('PRONOSTICOS') && modulos.has('USUARIOS'),
  'movimientos de ambos módulos emisores', [...modulos].join(','));

// ---------------------------------------------------------------------------
// 7. Errores de negocio
// ---------------------------------------------------------------------------
console.log('7. Casos de error');
const sinSaldo = await post('/gamification/predictions', prediccion({
  eventoId: EVENTO_GP,
  tipo: 'GANADOR',
  payload: { ganadorId: 'ver' },
  costoTickets: 1_000_000,
}));
check(sinSaldo.status === 409 && sinSaldo.body.codigo === 'SALDO_INSUFICIENTE',
  'saldo insuficiente → 409 SALDO_INSUFICIENTE', JSON.stringify(sinSaldo.body));

const modalidadMala = await post('/gamification/predictions', prediccion({
  eventoId: EVENTO_GP,
  tipo: 'TRIPLETA_MAGICA',
  payload: { lo: 'que sea' },
  costoTickets: 10,
}));
check(modalidadMala.status === 422 && modalidadMala.body.codigo === 'MODALIDAD_NO_SOPORTADA',
  'modalidad desconocida → 422 MODALIDAD_NO_SOPORTADA', JSON.stringify(modalidadMala.body));

// ---------------------------------------------------------------------------
console.log(`\n${fallos === 0 ? '✔ TODOS LOS SMOKE TESTS PASARON' : `✘ ${fallos} verificaciones fallaron`}`);
process.exit(fallos === 0 ? 0 : 1);
