# 08 — Módulo Sports (catálogo) + Home real (Diseño)

> **Estado:** 🟡 Propuesta pendiente de aprobación. Sin código todavía (regla 3 de `03_instrucciones_fable5.md`).
> Objetivo: el Home deja de estar hardcodeado — eventos reales desde la API, con el widget de pronóstico correcto según el formato del deporte.

## 1. Backend — SportsModule (solo lectura en esta fase)

Bounded Context de catálogo deportivo. La escritura (crear eventos, actualizar resultados) llegará con el panel admin/oráculo; por ahora los datos entran por seed.

| Endpoint (`api/v1`) | Auth | Descripción |
|---|---|---|
| `GET /sports/events?estado=PROGRAMADO&cursor=&limit=` | `@Public()` | Próximos eventos ordenados por `fechaInicio`, paginación por cursor. El catálogo es contenido público (el Home debe funcionar sin sesión). |
| `GET /sports/events/:id` | `@Public()` | Detalle de un evento. |

**Shape de respuesta por evento** (diseñado para la UI del Home y el widget):

```jsonc
{
  "id": "…",
  "nombre": "Jornada 1: Real Madrid vs FC Barcelona",
  "fase": "Jornada 1",
  "fechaInicio": "2026-08-16T19:00:00Z",
  "estado": "PROGRAMADO",
  "competicion": { "nombre": "LaLiga", "slug": "laliga" },
  "deporte": { "nombre": "Fútbol", "slug": "futbol", "formato": "EQUIPOS" },
  "participantes": [
    { "id": "…", "nombre": "Real Madrid", "slug": "real-madrid", "rol": "LOCAL" },
    { "id": "…", "nombre": "FC Barcelona", "slug": "fc-barcelona", "rol": "VISITANTE" }
  ]
}
```

`deporte.formato` es el **discriminador de estrategia** para la UI (mismo patrón Strategy del schema): `EQUIPOS` → widget MARCADOR_EXACTO; `MULTITUDINARIO` → widget PODIO (con los participantes listados). Añadir un deporte nuevo no toca el frontend.

**Extra en Gamification:** `GET /gamification/predictions/mine?eventoId=` 🔒 — pronósticos del usuario autenticado (opcionalmente filtrados por evento), para que el widget muestre "ya pronosticaste X" al cargar en vez de descubrirlo con el `yaExistia` del POST.

**Seed ampliado:** +2 eventos de fútbol (jornadas 2 y 3) y +1 GP de F1, para que el carrusel tenga contenido. IDs deterministas nuevos (`…e3`, `…e4`, `…e5`), re-ejecutable como siempre.

## 2. Frontend — Home dinámico

1. **Carrusel "Próximos eventos"** (scroll horizontal, estilo stories de las referencias): `StoryCard` por evento con competición, participantes y fecha. Tap → selecciona el evento destacado.
2. **`MatchCard` destacado**: el evento seleccionado (por defecto el más próximo), con el widget según formato:
   - `EQUIPOS` → `MarcadorExactoWidget` (el stepper actual, generalizado).
   - `MULTITUDINARIO` → `PodioWidget` nuevo: elegir 1º/2º/3º entre los participantes (payload `{"podio": [id1,id2,id3]}`, costo 30).
3. **Estado de pronóstico existente**: al montar, consulta `/predictions/mine?eventoId=` (si hay sesión) y muestra "Ya pronosticaste: 2-1" en lugar del formulario.
4. Estados loading (skeletons del carrusel + card), error y empty en todos los fetch.

Sin cambios de schema. Sin páginas nuevas (todo vive en el Home).

## 3. Plan de ejecución al aprobar

1. Backend: SportsModule (DDD, servicios de lectura) + endpoint `predictions/mine` + seed ampliado
2. Frontend: cliente API (`getEventos`, `getMisPredicciones`), carrusel, widgets por formato, integración en Home
3. Push → deploy → verificación en producción (Home con eventos reales, pronóstico PODIO en el GP)
4. Actualización del doc 05
