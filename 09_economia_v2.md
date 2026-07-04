# 09 — Economía v2: los Tickets solo se ganan

> **Decisión de negocio** (Alexander, 2026-07-03) — aplicada de inmediato.
> Reemplaza el modelo v1 en el que cada pronóstico cobraba Tickets.

## Regla

1. **Los usuarios NUNCA pierden Tickets.** Pronosticar es **gratis** e ilimitado (una predicción por evento+modalidad). Los Tickets solo **se ganan**: bono de registro, aciertos de pronósticos (los pagará el oráculo), misiones, consumo de contenido.
2. **Única excepción — inscripción a torneos:** participar en un torneo/polla de temporada completa (ej. la Champions o el Mundial con los equipos ya definidos) **sí cuesta Tickets**, porque el premio es un artículo físico de valor que pone la empresa (camisetas, indumentaria deportiva original). Ese cobro vivirá en el futuro módulo de Torneos ("Pollas").

## Implicaciones técnicas (aplicadas)

- `POST /gamification/predictions` ya no recibe `costoTickets` ni toca el Ledger; idempotente por la unique `(usuario, evento, tipo)`. Respuesta sin `ledgerTransactionId`.
- `Prediccion.costoTickets` se conserva como columna (=0 en predicciones normales); los torneos futuros la reutilizarán para la inscripción.
- Seed sin cobros de pronósticos (usuarios del seed conservan sus 500 de bono). Nota: en la BD de producción quedan 2 transacciones históricas de cobro (v1) — inofensivas y auditables; el ledger es inmutable por diseño.
- UI: los widgets no muestran costo; el framing es de recompensa ("si aciertas, ganas Tickets"). El acento `ticket` sigue reservado a economía/CTA.
- El flujo económico del Ledger queda: TESORERIA → usuarios (bonos/recompensas) y usuarios → REDENCION (solo inscripción a torneos y canjes del marketplace).
