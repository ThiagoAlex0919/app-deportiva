# 13 — Detalle de Partido en Vivo (Diseño)

> **Estado:** 🟡 Propuesta pendiente de aprobación.
> Página interna de cada partido con marcador vivo, cronología, y contexto del torneo — con los datos que football-data.org provee en el tier free.

## 1. Qué se muestra (y qué no — honestidad de datos)

| Disponible (free tier) | En el detalle |
|---|---|
| Marcador en vivo + por tiempos | Hero: escudos, marcador grande, minuto pulsante EN VIVO / "Final" |
| Goles (autor, minuto, penal/autogol) | Cronología con iconos ⚽ ordenada por minuto |
| Tarjetas y cambios *(si el tier los entrega para ese partido)* | Cronología 🟨🟥 🔁 — sección condicional |
| Árbitro, estadio, fase | Ficha del partido |
| Standings del torneo | "Camino en el torneo": posición/grupo, PJ-G-E-P, GF:GC de ambos equipos |

**No disponible sin proveedor pago** (API-Football ~$20-40/mes): posesión, disparos, xG, alineaciones garantizadas. La UI está diseñada en secciones condicionales: si mañana pagamos el proveedor, solo se agregan secciones — sin rediseño. Anotado como decisión de negocio en doc 05.

## 2. Backend — en SportsModule

- **`GET /sports/events/:id/detail`** (`@Public()`): si el evento tiene `metadata.fdId`, consulta `/v4/matches/{fdId}` con **caché adaptativo**: 60s si EN_VIVO (marcador fresco), 15 min si no. Sin `fdId` (eventos del seed) responde el evento base sin secciones extra.
- **Standings con caché 1h**: `/v4/competitions/{code}/standings` → se extrae la fila de cada equipo del partido.
- Respuesta normalizada: `{ evento, marcador: {actual, medioTiempo}, minuto, cronologia: [{minuto, tipo: GOL|TARJETA_AMARILLA|TARJETA_ROJA|CAMBIO, equipoId, jugador, detalle}], ficha: {arbitro, estadio}, caminoTorneo: [{participanteId, grupo, posicion, pj, g, e, p, gf, gc, puntos}] }` — todo nullable/condicional.
- Presupuesto de requests: detalle solo se pide al entrar a la página (no polling automático en v1; botón/pull "Actualizar" en vivo). 10 req/min del free alcanza.

## 3. Frontend — página `/evento/[id]`

1. **Hero**: escudos reales + marcador `display` (o hora si no empezó), badge EN VIVO con minuto, competición y fase.
2. **Cronología**: lista vertical minuto a minuto (goles con autor, tarjetas, cambios), del más reciente al primero.
3. **Camino en el torneo**: mini-tabla comparativa de ambos equipos (grupo, posición, PJ, DG, puntos).
4. **Ficha**: estadio, árbitro, fecha/hora local.
5. **Pronóstico**: el mismo `PredictionPanel` (si PROGRAMADO) o tu pronóstico con estado.
6. Botón "Actualizar" visible solo EN_VIVO (re-fetch manual, sin polling en v1).

Navegación: click en la tarjeta destacada del Home y en cada fila/story → `/evento/[id]`.

## 4. Plan al aprobar

1. Backend: cliente football-data compartido + `detail` endpoint + standings cacheados
2. Frontend: página `/evento/[id]` con secciones condicionales + navegación desde el Home
3. Push → verificación con un partido real del Mundial en vivo
4. Doc 05 (incluida la nota de negocio sobre stats premium)
