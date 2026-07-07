# 05 — Estado del Proyecto (Punto de Sincronización)

> ## 🔖 CIERRE v0.1.0 (2026-07-06) — CÓMO RETOMAR
>
> **Lo que está VIVO en producción:** https://app-deportiva-delta.vercel.app (frontend Vercel) ← https://app-deportiva-api.onrender.com/api/v1 (NestJS + PostgreSQL en Render). Repo: https://github.com/ThiagoAlex0919/app-deportiva (push a `main` = deploy automático en ambos).
>
> **Funciona end-to-end:** registro/login JWT · pronósticos GRATIS sobre partidos REALES del Mundial 2026 (sync football-data.org cada 5-30 min) · marcador y minuto EN VIVO · Oráculo automático que paga recompensas al terminar los partidos · Billetera con Ledger de doble entrada · noticias RSS (bento + página interna) · tema light/dark · responsive desktop/mobile estilo OneFootball.
>
> **COLA PRIORIZADA para la próxima sesión:**
> 1. **Módulo Torneos/"Pollas"** — inscripción COBRADA en Tickets con premio físico (camisetas/indumentaria). Es el corazón del modelo de negocio (doc 09 §regla 2). Diseñar doc 15.
> 2. ~~Zona de Juego~~ ✅ HECHA 2026-07-07 (doc 14): marcador personal, tabs en juego/resueltos, faltantes, teasers.
> 3. **Aterrizar valores de negocio** — recompensas dummy en `backend/config/recompensas.json` (200/75/250) → modelo rentable y atractivo.
> 4. Ajustes finos del tema light (revisar contrastes tras uso real).
> 5. F1 real (football-data es solo fútbol — otro proveedor) · stats premium en vivo (API-Football ~$20-40/mes, decisión de negocio) · users v2 con roles admin (reemplaza ADMIN_API_KEY) · **flujo "olvidé mi contraseña" por email** (mientras tanto: `POST /admin/users/reset-password` con X-Admin-Key) · smoke tests con auth · migración formal Prisma · limpiar eventos ficticios del seed · service worker PWA.
>
> **Notas operativas:** tokens/keys viven en Render → Environment (`FOOTBALL_DATA_TOKEN`, `ADMIN_API_KEY`, `JWT_SECRET`). Configs editables sin código: `backend/config/{recompensas,fuentes-rss,competiciones-sync}.json`. Keep-alive: GitHub Action cada 10 min (pestaña Actions). Para que el asistente pueda hacer push: generar un token nuevo de GitHub (el usado en la sesión v0.1.0 debe revocarse).

> **Propósito:** Este archivo es la única fuente de verdad sobre el estado actual del desarrollo.
> Los chats de Backend y Frontend DEBEN leer este archivo al iniciar y actualizarlo al terminar su trabajo.
> Reglas absolutas del proyecto: ver `01_vision_y_stack.md`, `02_modelo_de_dominio.md`, `03_instrucciones_fable5.md`, `04_sitemap_y_ux.md`.

**Última actualización:** 2026-07-03 — Chat de Frontend
**Fase 1 — Modelado de Base de Datos y Arquitectura:** ✅ **Completada** (schema aprobado formalmente el 2026-07-03)
**Fase 2 (parte 1) — Vertical Slice del Backend (Ledger + Gamification):** ✅ **Completada** (esquema extendido, seed y smoke tests aprobados formalmente el 2026-07-03)
**Fase 3 (parte 1) — Fase 1 del Frontend (scaffold + design system + Billetera):** ✅ **Código generado** (design system `06_design_system.md` aprobado formalmente el 2026-07-03; build verificado)
**Fase 3 (parte 1) — INTEGRACIÓN VALIDADA EN PRODUCCIÓN 2026-07-03:** ✅ Billetera en Vercel consume el Ledger de Render (saldo 420 + historial); CORS con comodín `*.vercel.app` para previews
**Siguiente paso inmediato:** 🎯 A definir: módulo `users` (JWT) en backend, o Home/feed + páginas de equipo en frontend

**Repositorio:** https://github.com/ThiagoAlex0919/app-deportiva (rama `main`; push = deploy automático)
**Deploy (frontend):** https://app-deportiva-delta.vercel.app (Vercel, Root Directory = `frontend`, env `NEXT_PUBLIC_API_URL` → API de Render)
**Deploy (backend):** https://app-deportiva-api.onrender.com/api/v1 (Render Blueprint `render.yaml`: web service Node + PostgreSQL free, `db push` + seed idempotente en cada arranque). Verificado 2026-07-03: `GET /ledger/balance` del usuario demo devuelve saldo 420 = bono 500 − pronósticos sembrados (50+30) — el Ledger cuadra en producción. Avisos plan free: el servicio se duerme con inactividad (~50 s de arranque frío) y la BD free de Render caduca (revisar dashboard).

**Endpoints operativos** (prefijo `api/v1`; 🔒 = requiere `Authorization: Bearer <accessToken>`):

| Endpoint | Descripción |
|---|---|
| `POST /api/v1/auth/register` | Crea usuario + bono de bienvenida (500 Tickets, idempotente) → tokens |
| `POST /api/v1/auth/login` | Login email+password → accessToken (15m) + refreshToken (7d, rotativo) |
| `POST /api/v1/auth/refresh` | Rota el refresh token → par nuevo |
| `POST /api/v1/auth/logout` | Revoca el refresh token |
| 🔒 `GET /api/v1/users/me` | Perfil del usuario del token |
| 🔒 `GET /api/v1/ledger/balance` | Saldo de Tickets, siempre derivado del Ledger (vista Billetera) |
| 🔒 `GET /api/v1/ledger/history?cursor=&limit=` | Historial de movimientos, paginación por cursor (vista Billetera) |
| 🔒 `POST /api/v1/gamification/predictions` | Crea un pronóstico multi-modalidad — **GRATIS** (economía v2, doc 09); idempotente por usuario+evento+modalidad |
| 🔒 `GET /api/v1/gamification/predictions/mine?eventoId=` | Pronósticos del usuario con contexto del evento + `resumen` (marcador personal — doc 14) |
| 🔑 `POST /api/v1/admin/events/:id/finish` | Backoffice (header `X-Admin-Key`): carga resultado, FINALIZA el evento y dispara el Oráculo |
| `GET /api/v1/sports/events?estado=&cursor=&limit=` | Catálogo público de eventos; `deporte.formato` discrimina el widget de la UI |
| `GET /api/v1/sports/events/:id` | Detalle de un evento |
| `GET /api/v1/content/news?deporte=&cursor=&limit=` | Feed público de noticias (agregación RSS con caché de 15 min) |
| `GET /api/v1/content/news/:id` | Detalle de una noticia (página interna `/noticia/[id]`) |
| `GET /api/v1/marketplace/products` | Catálogo público de la Tienda + reglas de descuento (configs editables) |
| 🔒 `POST /api/v1/marketplace/orders` | Checkout: cobra Tickets como DESCUENTO vía Ledger (idempotente) → orden PENDIENTE_PAGO |
| 🔒 `GET /api/v1/marketplace/orders/mine` | Mis pedidos con estado |
| 🔑 `POST /api/v1/admin/marketplace/orders/:id/status` | Backoffice: PAGADA/ENVIADA/ENTREGADA/CANCELADA (cancelar reversa los tickets) |
| 🔑 `POST /api/v1/admin/users/reset-password` | Backoffice: resetea contraseña y revoca sesiones |

*Deuda técnica RESUELTA (2026-07-03, `07_modulo_users_jwt.md`):* el `usuarioId` ya NO viaja por query/body — sale del access token (`@CurrentUser`). Guard global secure-by-default (`@Public()` solo en `/auth/*`). Errores de negocio: `{ statusCode, codigo, mensaje, timestamp, path }`. Usuarios del seed: `demo@app-deportivo.test` / `tester@app-deportivo.test`, password `demo1234`.
*⚠️ Pendiente:* `backend/scripts/smoke-tests.mjs` sigue usando el contrato viejo (usuarioId por query) — actualizarlo para el flujo con auth.

---

## 1. Base de Datos

| Ítem | Estado | Notas |
|---|---|---|
| `schema.prisma` (abstracciones base) | ✅ Aprobado | `Deporte → Competicion → Temporada → Evento → Participante` |
| Ledger de Tickets (doble entrada) | ✅ Aprobado | `LedgerAccount`, `LedgerTransaction`, `LedgerEntry`. Sin campo de saldo en `Usuario` |
| Migración inicial (`prisma migrate`) | ⬜ Pendiente | Ejecutar en Fase 2 al inicializar el backend |
| Modelos de Gamificación (motor de reglas) | ⬜ Pendiente | Fase posterior; el Ledger ya soporta sus asientos vía `ModuloSistema` |
| Modelo `Prediccion` (multi-modalidad) | ✅ Añadido 2026-07-03 | `tipo` String (modalidad: MARCADOR_EXACTO, GANADOR, PODIO...) + `payload` Json flexible por deporte. Unique `usuario+evento+tipo` alineada con la idempotencyKey del cobro. Anclado a `Evento` |
| Modelos de Pronósticos/Desafíos (resto: pollas, rankings) | ⬜ Pendiente | Fases posteriores |
| Modelos de Marketplace y Reservas | ⬜ Pendiente | Módulos desacoplados; solo tocan Tickets vía Ledger |

**Decisiones de arquitectura tomadas (Fase 1):**
1. El saldo de Tickets es **derivado** (suma de asientos del Ledger), nunca almacenado en `Usuario`. Cacheable en Redis.
2. Doble entrada estricta: toda transacción tiene ≥2 asientos y la suma de débitos = suma de créditos. Invariante aplicada en la capa de dominio (Prisma no puede expresarla).
3. Referencias polimórficas del Ledger (`referenciaTipo` + `referenciaId`) en lugar de FKs directas, para mantener los módulos desacoplados (DDD: el contexto Economía no conoce a Marketplace/Gamificación).
4. Campos específicos por deporte se modelan en columnas `Json` (`metadata`, `resultado`) para mantener el dominio abstracto y agnóstico al deporte.
5. `idempotencyKey` única en transacciones para evitar dobles emisiones ante reintentos.
6. Identificadores UUID en todas las tablas (preparación para microservicios / IDs generables en app).
7. Schema validado contra **Prisma 7.8** (motor oficial). En Prisma 7 la URL de conexión no va en el schema: se configura en `prisma.config.ts` + adapter de `PrismaClient` (nota incluida en el datasource).

## 2. APIs (Backend — NestJS)

| Ítem | Estado |
|---|---|
| Estructura de carpetas DDD (Fase 2) | ✅ Creada en `backend/` según `06_arquitectura_nestjs.md` |
| Módulo Usuarios (auth JWT + refresh) | ⬜ No iniciado ← **SIGUIENTE del backend** |
| Módulo Economía (servicio Ledger transaccional) | ✅ Funcional (escritura interna + APIs de lectura) |
| Módulo Gamificación (motor de reglas + eventos de sistema) | 🟡 Esqueleto + caso de uso Pronósticos (motor de reglas pendiente) |

**Contrato definido e implementado:** `LedgerService.registrarTransaccion()` (`backend/src/modules/ledger/application/services/ledger.service.ts`) — único punto de escritura al Ledger. Garantiza: invariantes de doble entrada en la entidad de dominio, idempotencia por clave única, saldo no-negativo verificado en transacción **Serializable** de PostgreSQL.

**Endpoints creados (2026-07-03) — listos para ser probados:**

| Método y ruta (prefijo `api/v1`) | Módulo | Descripción |
|---|---|---|
| `GET /api/v1/ledger/balance?usuarioId=` | Ledger | Saldo derivado del ledger (nunca almacenado) |
| `GET /api/v1/ledger/history?usuarioId=&cursor=&limit=` | Ledger | Historial de billetera, paginación por cursor |
| `POST /api/v1/gamification/predictions` | Gamification | Crea y PERSISTE el pronóstico (`tipo` + `payload` flexible) y cobra tickets vía `LedgerService`. Idempotente: 1 pronóstico por usuario+evento+**modalidad** |

**Decisiones tomadas en el Vertical Slice (a validar por el Arquitecto):**
1. **Identidad temporal:** sin módulo `users`, el `usuarioId` viaja por query/body. Deuda técnica: al implementar JWT, se sustituye por `@CurrentUser` y se eliminan esos campos de los DTOs.
2. ~~El payload del pronóstico no se persiste~~ → **RESUELTO 2026-07-03:** modelo `Prediccion` añadido al schema (`tipo` + `payload` Json). El catálogo de modalidades vive en el dominio (`gamification/domain/modalidades.ts`) — añadir una modalidad NO requiere migración. Nota de atomicidad: cobro (ledger) y fila `Prediccion` van en dos transacciones; el upsert por unique compuesta repara el caso borde de crash intermedio. Unificarlas requiere extender el contrato del Ledger (candidato Fase 2 parte 2).
3. La inscripción del pronóstico va a la cuenta de sistema `REDENCION` con `modulo=PRONOSTICOS`, `motivo=PAGO`.
4. Saldo derivado en vivo (sin caché Redis todavía); apoyado en el índice `(cuentaId, createdAt)`.
5. Cuentas del ledger de creación perezosa (billetera y cuentas de sistema se crean con su primer movimiento).

**Datos de prueba y smoke tests (creados 2026-07-03):**
- `backend/prisma/seed.ts` (`npm run seed`): 2 deportes con formatos distintos (Fútbol EQUIPOS, F1 MULTITUDINARIO), eventos PROGRAMADOS con participantes, 2 usuarios con bono de 500 tickets (doble entrada desde TESORERIA) y **2 pronósticos sembrados con modalidades diferentes** para el usuario demo: `MARCADOR_EXACTO` (payload `{"marcador":[2,1]}`) y `PODIO` (payload `{"podio":[...]}`). Re-ejecutable (upserts + idempotencyKeys).
- `backend/scripts/smoke-tests.mjs` (`npm run smoke`): contra la API crea **2 modalidades distintas** con el usuario tester, verifica idempotencia (repetir no cobra doble), delta exacto de saldo, historial con ambos módulos emisores, y errores `SALDO_INSUFICIENTE` (409) y `MODALIDAD_NO_SOPORTADA` (422). Re-ejecutable (asserts por deltas).

**Para probar (pendiente de ejecutar en la máquina del desarrollador):**
```bash
cd backend
cp .env.example .env   # configurar DATABASE_URL
npm install
npx prisma migrate dev --name init_con_predicciones   # ← migración inicial pendiente (ver §1)
npm run seed
npm run start:dev      # en otra terminal:
npm run smoke
```
Verificación estática realizada: imports resuelven, modelos/campos/códigos de error consistentes entre schema, código, seed y smoke tests, y copia `backend/prisma/schema.prisma` sincronizada con la raíz. Falta compilación real (`npm run build`) tras instalar dependencias.

## 3. Frontend (Next.js PWA)

| Ítem | Estado |
|---|---|
| `06_design_system.md` (tokens, paleta, componentes) | ✅ Aprobado 2026-07-03 |
| Estructura base + Tailwind + PWA (Fase 3) | ✅ Generado en `frontend/` (Next 16, App Router, Tailwind **v4 CSS-first** — tokens en `globals.css @theme`, no hay `tailwind.config.ts`) |
| Bottom Tab Bar (5 módulos según `04_sitemap_y_ux.md`) | ✅ Funcional (`/`, `/juego`, `/billetera`, `/tienda`, `/perfil`) |
| Billetera (consume saldo + historial del Ledger) | ✅ Conectada a `GET /ledger/balance` y `GET /ledger/history` (cursor) |
| PredictionWidget (MARCADOR_EXACTO en Home) | ✅ Conectado a `POST /gamification/predictions` (evento del seed; maneja `yaExistia` y `SALDO_INSUFICIENTE`) |
| Primitivas UI | ✅ Estilo shadcn escritas a mano (el CLI de shadcn requería red externa no disponible); patrones cva + Slot |
| Fuente | Inter autoalojada vía `@fontsource-variable/inter` (sin fetch a Google Fonts en build) |
| Identidad | TEMPORAL: usuario demo del seed (`useSession` en Zustand) hasta módulo users (JWT) |
| Pendiente Fase 3 parte 2 | Service worker/offline, Home con feed real (módulo sports/contenido), Zona de Juego, Tienda, Perfil reales |

**Cómo correr el frontend:** `cd frontend && cp .env.example .env.local && npm install && npm run dev` → http://localhost:3001 (backend en :3000 con seed ejecutado). Build verificado: `npm run build` ✅ (7 rutas).

**Operación del arranque (optimizado):** el startCommand de Render ya NO corre el seed (~40s ahorrados por arranque); solo `db push` (~2s) + `node dist/main`. Si cambia `prisma/seed.ts`: poner `SEED_ON_BOOT=true` en Environment, dejar arrancar una vez, y volverla a `false`. Además, `.github/workflows/keep-alive.yml` hace ping cada 10 min para que el plan free no se duerma (el despertar de ~50s es plataforma de Render y solo lo elimina un plan pago o el keep-alive).

## 4. Tareas Pendientes

- [x] Revisión y aprobación formal del `schema.prisma` — aprobado 2026-07-03
- [x] Aprobación de `06_arquitectura_nestjs.md` — aprobado 2026-07-03
- [x] Fase 2 (parte 1): Vertical Slice Ledger + Gamification — código generado 2026-07-03
- [x] Modelo `Prediccion` multi-modalidad (tipo + payload Json) + seed + smoke tests — 2026-07-03
- [x] **Vertical Slice del Backend — APROBADO y COMPLETADO 2026-07-03**
- [ ] **Fase 3: inicio del desarrollo del Frontend en Next.js (PWA + Tailwind + Shadcn/UI) — delegar a Chat Frontend** ← SIGUIENTE
- [ ] Ejecutar en local (junto al arranque del Frontend): `npm install` + `prisma migrate dev` + `npm run seed` + `npm run smoke`
- [ ] Fase 2 (parte 2): módulo `users` (auth JWT + refresh) y módulo `sports` (catálogo/eventos)
- [ ] Extender schema: gamificación, pronósticos, marketplace, reservas (iteraciones futuras)

---

## Registro de cambios

| Fecha | Chat | Cambio |
|---|---|---|
| 2026-07-07 | Full-stack | **MARKETPLACE — TIENDA** (`15_marketplace_tienda.md` aprobado): modelo `Orden` (snapshot de producto), catálogo y reglas en configs editables (`productos.json`, `marketplace.json` — ⚠️ valores dummy: 1🎟=$50 COP, tope 30%), checkout que cobra Tickets como DESCUENTO vía Ledger (idempotente, `SALDO_INSUFICIENTE` si no alcanzan) y REVERSO automático al cancelar. Frontend `/tienda`: grid imagen-protagonista con badge "Hasta −30%", panel de compra con simulador de descuento en vivo (slider), mis pedidos con estados. **v1 SIN pasarela** (pago coordinado manualmente + backoffice); v2: Wompi/MercadoPago cuando exista cuenta de comercio. |
| 2026-07-07 | Full-stack | **ZONA DE JUEGO** (`14_zona_de_juego.md` aprobado): `predictions/mine` enriquecido (join de evento+participantes, `resumen` con aciertos/precisión/tickets ganados). Página `/juego`: marcador personal (4 stat-cards, tickets con acento), tabs En juego/Resueltos con tarjetas de pronóstico (banderas apiladas, pick legible, chip de estado/recompensa), "te faltan por pronosticar" (catálogo − tuyos) y teasers de Pollas/Misiones. |
| 2026-07-03 | Arquitecto | Creación del archivo. Generado `schema.prisma` v1 (dominio abstracto + Ledger). Fase 1 en progreso. |
| 2026-07-03 | Arquitecto | Schema aprobado. **Fase 1 completada.** Siguiente: Fase 2 — inicialización del backend NestJS (Chat Backend). |
| 2026-07-03 | Backend | `06_arquitectura_nestjs.md` aprobado. Generado Vertical Slice en `backend/`: scaffold NestJS + módulo Ledger (entidad con invariantes, `registrarTransaccion()`, `GET /ledger/balance`, `GET /ledger/history`) + módulo Gamification (`POST /gamification/predictions`). Endpoints listos para probar; pendiente `npm install` + migración. |
| 2026-07-03 | Backend | Schema extendido con `Prediccion` multi-modalidad (`tipo` String + `payload` Json, unique usuario+evento+tipo, `EstadoPrediccion`). Servicio de predicciones ahora persiste el pronóstico (catálogo de modalidades en dominio). Creados `prisma/seed.ts` y `scripts/smoke-tests.mjs` con 2 modalidades distintas (MARCADOR_EXACTO fútbol / PODIO F1). |
| 2026-07-03 | Backend | Esquema, seed y tests aprobados. **Vertical Slice del Backend COMPLETADO.** Endpoints operativos: `GET /ledger/balance`, `GET /ledger/history`, `POST /gamification/predictions`. Siguiente paso inmediato: **Fase 3 — inicio del Frontend en Next.js (Chat Frontend)**. |
| 2026-07-03 | Frontend | `06_design_system.md` creado y aprobado (análisis de `referencias_ui/`). Generada Fase 1 del frontend en `frontend/`: Next 16 + Tailwind v4 + Zustand, tokens del design system, AppShell + BottomTabBar (5 tabs), vertical Billetera conectada al Ledger y PredictionWidget (MARCADOR_EXACTO) contra `POST /gamification/predictions`. Build ✅. Pendiente: validación en local contra el backend. |
| 2026-07-03 | Frontend | Deploy completo: repo GitHub + Vercel (frontend) + Render (backend + PostgreSQL, blueprint `render.yaml`). Integración validada en producción. CORS con comodín `*.vercel.app`. |
| 2026-07-03 | Full-stack | **Módulo users + JWT** (`07_modulo_users_jwt.md` aprobado): schema +`passwordHash` +`RefreshToken`, auth con access 15m + refresh rotativo hasheado, guard global secure-by-default, bono de bienvenida vía Ledger, endpoints existentes protegidos (fin del usuarioId por query/body). Frontend: `/login`, `/registro`, sesión Zustand persist (access solo en memoria), refresh automático en 401, Perfil real con logout. Build frontend ✅. Pendiente: actualizar smoke tests al contrato con auth. |
| 2026-07-03 | Full-stack | **Auth VERIFICADO EN PRODUCCIÓN**: registro real desde Vercel con bono de bienvenida funcionando. Fixes de build en el camino: TS7006 (tipos del callback CORS) y TS2322 (cast de expiresIn). Nota de operación: en el plan free de Render el arranque frío (~50s) + `db push`+seed del startCommand hacen lenta la primera petición; candidato a optimizar (mover seed a manual o keep-alive). |
| 2026-07-03 | Full-stack | **SportsModule + Home real** (`08_modulo_sports_y_home.md` aprobado): catálogo público de eventos con `formato` como discriminador de estrategia, `predictions/mine`, seed ampliado (5 eventos, +Atlético/Sevilla, +GP Italia). Frontend: Home dinámico con carrusel de eventos, EventCard con layout por formato (vs con cancha sutil / parrilla de carrera), PodioWidget nuevo, resumen "ya pronosticaste". **Responsive desktop**: SideNav en lg+, tab bar solo mobile, Home a 2 columnas con destacado sticky. Build frontend ✅. |
| 2026-07-03 | Full-stack | **ECONOMÍA v2** (`09_economia_v2.md`, decisión de negocio): los Tickets solo se GANAN — pronosticar es gratis (sin cobro al Ledger, sin `costoTickets` en el DTO); el único cobro futuro será la inscripción a torneos con premio físico (módulo Pollas). Widgets con framing de recompensa ("gana si aciertas"). Referencia UI oficial: OneFootball (app + web). |
| 2026-07-06 | Full-stack | **DETALLE DE PARTIDO EN VIVO** (`13_detalle_partido_vivo.md` aprobado): `GET /sports/events/:id/detail` con caché adaptativo (60s en vivo / 15 min), cronología (goles/tarjetas/cambios), standings del torneo (caché 1h), ficha. Página `/evento/[id]`: hero con marcador vivo y minuto, cronología por equipo, mini-tabla comparativa, pronóstico integrado, botón Actualizar (sin polling en v1). ⚠️ Nota de negocio: posesión/disparos/alineaciones requieren proveedor pago (API-Football ~$20-40/mes) — la UI ya es condicional para absorberlo. |
| 2026-07-06 | Full-stack | **SYNC DE FIXTURES REALES** (`12_sync_fixtures.md` aprobado): `FixturesSyncService` contra football-data.org (Mundial/LaLiga/Champions en `config/competiciones-sync.json`), caché 30 min disparado por `GET /sports/events`, upserts idempotentes con UUIDs deterministas, escudos reales en `metadata.crest`. **Loop autónomo**: partido FINISHED → posiciones + Oráculo → recompensas, sin intervención manual. Frontend: escudos reales, badge EN VIVO (color `live`), pronósticos bloqueados fuera de PROGRAMADO. Keep-alive con doble ping (noticias + fixtures). Requiere `FOOTBALL_DATA_TOKEN` en Render (sync: false — se pega a mano, jamás se commitea). |
| 2026-07-06 | Full-stack | **Rediseño de noticias** (pedido de Alexander): tarjetas imagen-protagonista (fondo + gradiente + titular encima), portada bento (hero 2×2 + lateral + fila de 3) y sección "Más noticias" en grid de 3 columnas. Página interna `/noticia/[id]` (titular + resumen + imagen, lo que el agregador posee legalmente) con CTA "Leer completo en {fuente}" — el artículo entero pertenece al medio. Fix previo: import CJS de rss-parser (esModuleInterop). |
| 2026-07-04 | Full-stack | **MÓDULO CONTENT — NOTICIAS RSS** (`11_modulo_content_noticias.md` aprobado): modelo `Noticia` (dedupe por url), fuentes en `backend/config/fuentes-rss.json` (editable — ⚠️ URLs a validar en producción), agregador con `rss-parser` (timeout por fuente, fallos ignorados con log), refresco on-demand con caché 15 min, `GET /content/news` público. Keep-alive ahora apunta a este endpoint (despierta el servicio Y refresca el feed). Frontend: NewsCard estilo OneFootball (título + imagen + fuente + antigüedad, abre el medio) y sección Noticias en el Home (grid 2 col en desktop, "Ver más" por cursor). |
| 2026-07-03 | Full-stack | **EL ORÁCULO** (`10_oraculo.md` aprobado): `OraculoService` con resolutores por modalidad (espejo de modalidades.ts), pago de recompensas vía Ledger idempotente (`RECOMPENSA:{prediccionId}`), transiciones solo desde PENDIENTE. Recompensas en `backend/config/recompensas.json` — ⚠️ **VALORES DUMMY (200/75/250), pendiente aterrizarlos con el modelo de negocio (rentable + atractivo)**. Endpoint backoffice `POST /admin/events/:id/finish` con `AdminKeyGuard` (X-Admin-Key, env generada en Render; roles reales llegan con users v2). Frontend: resumen de pronóstico coloreado (acertada +recompensa / fallada / anulada). Pendiente: verificación en producción (cierre del Clásico). |
