# 14 — Zona de Juego (Diseño)

> **Estado:** 🟡 Propuesta pendiente de aprobación.
> La pestaña Juego (04_sitemap_y_ux.md §1.B) deja de ser placeholder: tu centro de pronósticos — resultados, racha y qué te falta por jugar. Misiones y Pollas quedan visibles como "próximamente" (las Pollas son la iteración 1 de la cola).

## 1. Backend — enriquecer lo existente (sin módulos nuevos)

**`GET /gamification/predictions/mine` se enriquece** (mismo endpoint, respuesta ampliada):

```jsonc
{
  "resumen": {
    "total": 12, "pendientes": 3, "acertadas": 5, "falladas": 4, "anuladas": 0,
    "ticketsGanados": 1150,        // suma de recompensas de las acertadas
    "precision": 56                 // % acertadas sobre resueltas (sin pendientes/anuladas)
  },
  "predicciones": [{
    // ...campos actuales (tipo, payload, estado, recompensaTickets, createdAt)...
    "evento": {                     // NUEVO: contexto para pintar la tarjeta
      "id": "…", "nombre": "USA vs Belgium", "fechaInicio": "…",
      "estado": "FINALIZADO", "competicion": "Copa Mundial de la FIFA",
      "participantes": [{ "id": "…", "nombre": "USA", "rol": "LOCAL", "imagenUrl": "…" }]
    }
  }]
}
```

Un solo join extra en `listarMias` (evento → temporada → competición + participantes). Sin cambios de schema.

## 2. Frontend — página `/juego`

1. **Marcador personal** (arriba, 4 mini-cards): Aciertos · Precisión % · Tickets ganados (acento `ticket` — es economía) · En juego. Números en tipografía display.
2. **Tabs "En juego" / "Resueltos"**: tarjetas de pronóstico con estilo OneFootball — banderas circulares del evento, tu pick legible ("2-1" / podio), chip de estado (pendiente neutro / acertada `success` +recompensa / fallada gris / anulada), fecha; click → `/evento/[id]`.
3. **"Te faltan por pronosticar"**: carrusel/grid de eventos PROGRAMADOS sin pronóstico tuyo (cruce de catálogo vs mine en el cliente) → click lleva al detalle, donde ya vive el widget.
4. **Próximamente**: dos tarjetas teaser — "Misiones diarias" y "Pollas: torneos con premios reales 🏆" (ancla del módulo 1 de la cola).
5. Todo tras `RequireSession`; estados loading/error/empty como siempre.

## 3. Plan al aprobar

1. Backend: `listarMias` con evento + resumen agregado
2. Frontend: página Juego completa (stats, tabs, faltantes, teasers)
3. Push → verificación en producción con tu usuario real → doc 05
