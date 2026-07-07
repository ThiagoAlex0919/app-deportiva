# 15 — Marketplace: Tienda con descuentos por Tickets (Diseño)

> **Estado:** 🟡 Propuesta pendiente de aprobación.
> D. Tienda y Escenarios (04_sitemap_y_ux.md §1.D): artículos deportivos comprables con dinero real, con **descuento canjeando Tickets acumulados** — el "sumidero" de la economía (usuarios → REDENCION, motivo `DESCUENTO`, ya previsto en el Ledger desde el doc 02).

## 1. Decisión de pagos (v1 honesta)

Integrar "cualquier medio de pago" REAL exige una pasarela (Wompi/MercadoPago/Stripe) con cuenta de comercio, verificación y credenciales tuyas — trámite de días fuera del código. Propuesta v1:

- El checkout crea la **orden** y cobra los Tickets del descuento vía Ledger **de inmediato** (auditado, idempotente).
- El saldo en dinero queda **`PENDIENTE_PAGO`**: v1 muestra "te contactaremos para coordinar pago y envío" (WhatsApp/transferencia — operación manual tuya) y el backoffice marca `PAGADA → ENVIADA → ENTREGADA`.
- **v2 (cuando tengas cuenta de comercio):** se enchufa la pasarela en el mismo flujo — la orden ya está modelada para eso (`estado` + monto). Recomendada para Colombia: **Wompi** o **MercadoPago**.

## 2. Reglas del descuento (config editable, valores DUMMY de negocio)

`backend/config/marketplace.json`:

```jsonc
{
  "valorTicketCop": 50,            // 1 Ticket = $50 COP de descuento
  "maxDescuentoPorcentaje": 30     // tope: 30% del precio por orden
}
```

⚠️ Dummy como las recompensas — aterrizar con el modelo de negocio (misma tarea de la cola).

## 3. Catálogo en config (mismo patrón probado)

`backend/config/productos.json` — editable sin código:

```jsonc
[
  { "slug": "camiseta-colombia-2026", "nombre": "Camiseta Selección Colombia 2026", "descripcion": "Original Adidas, local", "precioCop": 349900, "imagenUrl": "https://…", "categoria": "camisetas", "activo": true },
  { "slug": "balon-mundial-2026", "nombre": "Balón oficial Mundial 2026", "precioCop": 289900, … }
]
```

## 4. Backend — MarketplaceModule

| Endpoint | Auth | Descripción |
|---|---|---|
| `GET /marketplace/products` | público | Catálogo activo + reglas de descuento (para pintar el simulador) |
| `POST /marketplace/orders` 🔒 | Bearer | Crea orden: valida producto y saldo, calcula descuento (`min(tickets × valorTicket, tope%)`), **cobra Tickets vía LedgerService** (`MARKETPLACE`/`DESCUENTO`, `idempotencyKey: DESCUENTO:{ordenId}`, falla con `SALDO_INSUFICIENTE` si no alcanzan), guarda snapshot del producto + dirección/teléfono → `PENDIENTE_PAGO` |
| `GET /marketplace/orders/mine` 🔒 | Bearer | Mis pedidos con estado |
| `POST /admin/marketplace/orders/:id/status` | X-Admin-Key | Backoffice: `PAGADA` → `ENVIADA` → `ENTREGADA` / `CANCELADA` (cancelar REVERSA los tickets vía Ledger, motivo `REVERSO`) |

**Schema nuevo:** `Orden` (usuarioId, snapshot del producto, `ticketsUsados`, `descuentoCop`, `totalCop`, estado, dirección, teléfono, `ledgerTransactionId`) + enum `EstadoOrden`. Los productos NO van a BD (config JSON) — la orden guarda el snapshot.

## 5. Frontend — `/tienda`

1. **Grid de productos** imagen-protagonista (patrón de noticias): foto, nombre, precio COP y badge "Hasta −30% con Tickets" (acento `ticket` — ES economía). Público.
2. **Panel de compra** (al tocar, requiere sesión): stepper/slider de Tickets a usar (tope = min(saldo, tope% del precio)), desglose en vivo `precio − descuento = total`, campos dirección + teléfono, CTA `cta` "Confirmar pedido". Toast de éxito con "te contactaremos para el pago".
3. **Mis pedidos**: lista con estado (chips: pendiente de pago / pagada / enviada / entregada) y tickets usados.
4. La Billetera muestra el débito automáticamente (historial del Ledger).

## 6. Plan al aprobar

1. Schema `Orden` + configs + MarketplaceModule (checkout con Ledger + reverso en cancelación)
2. Frontend: grid, panel de compra con simulador de descuento, mis pedidos
3. Push → `SEED_ON_BOOT` no hace falta (sin seed) → verificación: compra real con tus tickets en producción
4. Doc 05 (+ nota: pasarela v2 pendiente de cuenta de comercio)
