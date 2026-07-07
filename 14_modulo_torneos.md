# 14 — Módulo Torneos ("Pollas"): inscripción cobrada + premio físico (Diseño)

> **Estado:** 🟡 Propuesta pendiente de aprobación.
> El corazón del modelo de negocio (doc 09 §regla 2): la ÚNICA operación que cuesta Tickets. El usuario se inscribe a la polla de un torneo real (ej. el Mundial en curso), compite con sus aciertos, y el mejor gana un premio FÍSICO que pone la empresa (camiseta/indumentaria original).

## 1. Concepto

Un **Torneo** es una competencia de pronósticos atada a una competición real completa. Los inscritos acumulan **aciertos** con sus pronósticos normales (que siguen siendo gratis) sobre los partidos de esa competición; el ranking define al ganador del premio físico. La inscripción se cobra UNA vez vía Ledger.

## 2. Schema (nuevo)

```prisma
model Torneo {
  id                     String   @id @default(uuid())
  slug                   String   @unique
  nombre                 String   // "Polla Mundialista 2026"
  descripcion            String?
  competicionId          String   // competición real que puntúa (ej. mundial)
  competicion            Competicion @relation(...)
  costoInscripcion       Int      // ⚠️ valor dummy, editable por seed/admin
  premioDescripcion      String   // "Camiseta oficial de tu selección"
  premioImagenUrl        String?
  fechaCierreInscripcion DateTime // después de esto no hay inscripciones
  estado                 EstadoTorneo @default(INSCRIPCIONES) // INSCRIPCIONES|EN_CURSO|FINALIZADO
  maxParticipantes       Int?     // null = sin cupo
  createdAt / updatedAt
  inscripciones          InscripcionTorneo[]
}

model InscripcionTorneo {
  id        String   @id @default(uuid())
  torneoId  String
  usuarioId String
  /** Transacción del Ledger que cobró la inscripción (auditoría). */
  ledgerTransactionId String
  createdAt DateTime @default(now())

  @@unique([torneoId, usuarioId]) // una inscripción por usuario
}
```

**Puntaje DERIVADO, no almacenado** (misma filosofía del Ledger): el ranking se calcula contando predicciones `ACERTADA` del inscrito sobre eventos de la competición del torneo, ponderadas por modalidad (`MARCADOR_EXACTO`=5, `PODIO`=5, `GANADOR`=2 — en `config/recompensas.json`, dummy). Sin contadores que se desincronicen.

## 3. Backend — TournamentsModule

| Endpoint (`api/v1`) | Auth | Descripción |
|---|---|---|
| `GET /tournaments` | público | Torneos con premio, costo, cupos usados/total, estado |
| `GET /tournaments/:id` | público | Detalle + **ranking** (top 50) con nombre del usuario y aciertos; si hay sesión, incluye `miPosicion` |
| `POST /tournaments/:id/join` | 🔒 | Valida ventana/cupo → **cobra vía LedgerService** (`motivo=PAGO`, `idempotencyKey=TORNEO:{torneoId}:{usuarioId}`, DEBITO usuario / CREDITO REDENCION) → crea inscripción. `SALDO_INSUFICIENTE` (409) lo maneja el Ledger. Idempotente: re-join devuelve `yaInscrito: true` sin cobrar |

Seed: 1 torneo real — **"Polla Mundialista 2026"** sobre la competición `mundial` del sync, costo **200 🎟** (dummy), premio "Camiseta oficial de la selección campeona" con cierre de inscripciones antes de la final. El bono de registro (500) alcanza para entrar: fricción cero para probar el flujo completo.

## 4. Frontend — la Zona de Juego cobra vida

La pestaña **/juego** deja de ser placeholder, con dos secciones:

1. **Torneos**: tarjeta destacada con imagen/emoji del premio, nombre, costo en `TicketBadge`, cupos y CTA **`variant="cta"`** — por fin un botón lime legítimo: es LA acción económica del sistema ("Inscribirme — 200 🎟"). Inscrito → "✓ Inscrito · Ver ranking". Confirmación con el saldo visible antes de cobrar.
2. **Mis pronósticos**: lista de tus pronósticos (via `predictions/mine` sin filtro) con el evento, tu pick, estado coloreado (pendiente/acertada +recompensa/fallada) — cierra el ítem #2 de la cola en la misma iteración.

Página **/torneo/[id]**: hero del premio, reglas cortas, tabla de ranking (posición, nombre, aciertos, puntos) con tu fila resaltada.

## 5. Plan al aprobar

1. Schema + seed del torneo mundialista
2. TournamentsModule (join con Ledger + ranking derivado)
3. Frontend: Zona de Juego (torneos + mis pronósticos) + página de ranking
4. Push → verificación en producción (inscribirse con usuario real: 500 → 300)
5. Doc 05
