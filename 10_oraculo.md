# 10 — El Oráculo: resolución de pronósticos y pago de recompensas (Diseño)

> **Estado:** 🟡 Propuesta pendiente de aprobación. Sin código todavía (regla 3 de `03_instrucciones_fable5.md`).
> Cierra el loop del producto con la economía v2: pronosticar es gratis → aciertas → **ganas Tickets**.

## 1. Flujo

```
Admin carga el resultado → Evento pasa a FINALIZADO
        ↓
Oráculo evalúa TODAS las predicciones PENDIENTES del evento
        ↓                                    ↓
    ACERTADA                              FALLADA
  paga recompensa vía Ledger          (solo cambia estado)
  (TESORERIA → usuario, RECOMPENSA)
```

## 2. Backend

### 2.1 Cierre de evento (nuevo, en SportsModule)

`POST /api/v1/admin/events/:id/finish` — protegido por **`X-Admin-Key`** (header contra env `ADMIN_API_KEY`, `generateValue` en Render). Los roles de usuario llegarán con users v2; una API key es el puente pragmático y honesto para el panel admin de esta fase.

```jsonc
// body — resultado global + posiciones por participante
{
  "resultado": { "marcador": [2, 1] },          // Json específico del deporte
  "posiciones": [                                // opcional (formatos de carrera)
    { "participanteId": "…", "posicionFinal": 1 },
    { "participanteId": "…", "posicionFinal": 2 }
  ]
}
```

Efectos: valida evento PROGRAMADO/EN_VIVO → guarda `resultado` y `posicionFinal` → estado `FINALIZADO` → **invoca al Oráculo**. Responde el resumen de resolución.

### 2.2 El Oráculo (GamificationModule, `OraculoService`)

- Recorre las predicciones `PENDIENTE` del evento y las resuelve con **estrategias por modalidad** (`gamification/domain/resolutores.ts`, espejo de `modalidades.ts` — añadir modalidad = añadir resolutor, sin migraciones):

| Modalidad | Acierta si | Recompensa |
|---|---|---|
| `MARCADOR_EXACTO` | `payload.marcador` == `resultado.marcador` (orden local/visitante) | **200** 🎟 |
| `GANADOR` | `payload.ganadorId` tiene `posicionFinal = 1` | **75** 🎟 |
| `PODIO` | `payload.podio` == top-3 de `posicionFinal` **en orden exacto** | **250** 🎟 |

- **Recompensas en `backend/config/recompensas.json`** — editable sin tocar código (requiere redeploy). ⚠️ Los valores actuales (200/75/250) son **DUMMIES**: pendiente aterrizarlos con el modelo de negocio para que la economía sea rentable y atractiva a la vez (tarea registrada en doc 05). El motor de reglas configurable en caliente llega después.
- **Pago vía `LedgerService`** (reintroduce la fachada en Gamification): DEBITO `TESORERIA` / CREDITO usuario, `modulo=PRONOSTICOS`, `motivo=RECOMPENSA`, `idempotencyKey = RECOMPENSA:{prediccionId}` → re-ejecutar el oráculo **jamás paga doble**; solo transiciona predicciones desde `PENDIENTE` (estado-máquina unidireccional).
- Evento `POSPUESTO/CANCELADO` → predicciones `ANULADA` (sin reverso: en v2 no hubo cobro).

### 2.3 Contratos que cambian

`GET /gamification/predictions/mine` ya devuelve `estado` — el frontend lo pinta sin cambios de contrato. Se añade `recompensaTickets` (null si pendiente/fallada) leyendo la transacción de recompensa.

## 3. Frontend (mínimo, aprovecha lo existente)

1. `ResumenPrediccion` colorea el estado: `acertada` en `success` + "+200 🎟", `fallada` en gris, `pendiente` como hoy.
2. La Billetera ya muestra las recompensas (créditos `RECOMPENSA` del historial) sin tocar nada.

## 4. Verificación en producción (plan)

1. `POST /admin/events/{CLASICO}/finish` con `{"marcador":[2,1]}` (curl con la admin key)
2. El usuario demo (pronóstico sembrado 2-1) pasa a `ACERTADA` → su saldo sube +200 (500 → 700)
3. Tu usuario real: si pronosticaste otro marcador → `FALLADA` (sin pérdida — economía v2)
4. El Clásico desaparece del Home (ya no está `PROGRAMADO`) — quedan 4 eventos

## 5. Plan de ejecución al aprobar

1. `OraculoService` + resolutores por modalidad + recompensas (Gamification, con LedgerService)
2. Endpoint admin `finish` en Sports (guard de API key) + `ADMIN_API_KEY` en render.yaml
3. Frontend: estados coloreados del resumen
4. Push → deploy → simulación del cierre del Clásico en producción
5. Doc 05
