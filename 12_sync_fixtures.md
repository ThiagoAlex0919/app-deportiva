# 12 — Sync de Fixtures Reales: football-data.org (Diseño)

> **Estado:** 🟡 Propuesta pendiente de aprobación. Sin código todavía.
> Objetivo: pronosticar sobre partidos REALES (el Mundial 2026 en curso: Bélgica vs EE.UU., Colombia vs Suiza...) — y que el Oráculo los resuelva SOLO cuando terminan.

## 1. Proveedor y credencial

- **football-data.org v4** (elegido). Token gratuito: registrarse en `football-data.org/client/register` → llega por email → configurarlo en Render como env **`FOOTBALL_DATA_TOKEN`**.
- Límite free: 10 requests/min — holgado: hacemos 1 request por competición cada 30 min de caché.

## 2. Competiciones en config editable (mismo patrón que RSS/recompensas)

`backend/config/competiciones-sync.json`:

```jsonc
[
  { "codigo": "WC", "slug": "mundial-2026", "nombre": "Copa Mundial de la FIFA" },
  { "codigo": "PD", "slug": "laliga", "nombre": "LaLiga" },
  { "codigo": "CL", "slug": "champions-league", "nombre": "UEFA Champions League" }
]
```

Añadir un torneo = una línea (códigos del catálogo de football-data).

## 3. Backend — `FixturesSyncService` (SportsModule)

**Mismo patrón probado del agregador RSS**: refresco on-demand con caché de 30 min, disparado por `GET /sports/events`; fallos por competición se loguean y se ignoran.

Por cada competición configurada pide `/v4/competitions/{codigo}/matches` (ventana: hoy −2 días → +14 días) y hace upsert idempotente sobre NUESTRO modelo (ids deterministas derivados del id del proveedor):

| football-data | Nuestro modelo |
|---|---|
| competition | `Competicion` (slug del config) + `Temporada` (por año) |
| team (id, nombre, escudo) | `Participante` (slug `fd-{id}`, `metadata.crest` para escudos reales) |
| match SCHEDULED/TIMED | `Evento` PROGRAMADO |
| match IN_PLAY/PAUSED | `Evento` EN_VIVO (badge "En directo" en el Home) |
| match FINISHED + score | `Evento` FINALIZADO + `resultado.marcador` + `posicionFinal` (1/2) → **invoca al Oráculo automáticamente** |

**El loop completo queda autónomo:** partido real termina → sync lo detecta → Oráculo resuelve → recompensas pagadas. El endpoint admin `finish` queda para eventos manuales (seed) y correcciones.

## 4. Frontend

- Badge **EN VIVO** (color `live` del design system) en tarjetas de eventos `EN_VIVO`; los eventos en vivo ya no aceptan pronósticos (regla existente `EVENTO_NO_APOSTABLE`).
- Escudos reales: `EntityAvatar` usa `metadata.crest` del participante cuando exista (el catálogo ya viaja al frontend).
- El keep-alive añade un ping a `/sports/events` — el sync corre solo cada ~30 min aunque nadie visite.

## 5. Notas

- Los eventos del seed (LaLiga ficticia de agosto + F1) conviven con los reales; el Home ordena por fecha. La F1 real llegaría después con otro proveedor (football-data es solo fútbol).
- Sin cambios de schema: `metadata` Json absorbe ids externos y escudos (para eso se diseñó — doc 02).

## 6. Plan al aprobar

1. Config + `FixturesSyncService` + mapeo de estados + invocación del Oráculo
2. Escudos + badge EN VIVO en frontend + keep-alive doble ping
3. Push → configurar `FOOTBALL_DATA_TOKEN` en Render → ver el Mundial real en el Home
4. Doc 05
