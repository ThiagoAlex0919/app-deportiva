# 06 — Arquitectura NestJS: Monolito Modular (Propuesta Fase 2)

> **Estado:** 🟡 PROPUESTA — pendiente de aprobación. No se ha ejecutado ningún comando ni creado archivos `.ts`.
> **Basado en:** `01_vision_y_stack.md` (DDD + Clean Architecture), `schema.prisma` aprobado (2026-07-03), `05_estado_del_proyecto.md` (Fase 2).
> **Autor:** Chat de Backend — 2026-07-03

---

## 1. Principios rectores

1. **Un módulo NestJS = un Bounded Context.** Los módulos reflejan los contextos ya definidos en el schema: dominio deportivo (`sports`), identidad (`users`), economía (`ledger`) y gamificación (`gamification`).
2. **Clean Architecture en 4 capas por módulo.** La regla de dependencia apunta siempre hacia adentro: `presentation → application → domain ← infrastructure`. El dominio no importa nada de NestJS ni de Prisma.
3. **Repositorios como puertos.** Cada módulo define interfaces de repositorio en `domain/`; la implementación Prisma vive en `infrastructure/` y se inyecta vía token de NestJS. El dominio nunca conoce a Prisma.
4. **Comunicación entre módulos solo por dos vías:**
   - **Síncrona:** servicios de aplicación exportados explícitamente por el módulo (fachada pública). Prohibido importar entidades, repositorios o internos de otro módulo.
   - **Asíncrona:** eventos de dominio vía `EventEmitter2` (in-process hoy; sustituible por un broker al migrar a microservicios).
5. **El Ledger tiene un único escritor.** `LedgerService.registrarTransaccion()` es el único punto de escritura de la economía. Ningún módulo toca las tablas `ledger_*` directamente.
6. **Entidades de dominio ≠ modelos Prisma.** Las entidades encapsulan invariantes (ej. doble entrada cuadrada a cero); los mappers en `infrastructure/` traducen entre ambos mundos.

## 2. Estructura de carpetas propuesta

```
backend/
├── prisma/
│   ├── schema.prisma              # el ya aprobado (se mueve aquí)
│   └── migrations/                # generadas por prisma migrate (Fase 2)
├── prisma.config.ts               # conexión por entorno (Prisma 7)
├── src/
│   ├── main.ts                    # bootstrap: pipes globales, CORS, helmet, versionado
│   ├── app.module.ts              # raíz: importa Config, Shared y los módulos de dominio
│   │
│   ├── config/                    # configuración tipada y validada (12-factor)
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── redis.config.ts
│   │   └── validation.schema.ts   # validación de env vars al arrancar (zod/joi)
│   │
│   ├── shared/                    # Shared Kernel — SIN lógica de negocio
│   │   ├── domain/
│   │   │   ├── entity.base.ts             # clase base de entidades (id UUID, equals)
│   │   │   ├── value-object.base.ts
│   │   │   ├── domain-event.base.ts
│   │   │   └── exceptions/                # DomainException y jerarquía
│   │   ├── application/
│   │   │   ├── dto/pagination.dto.ts      # paginación estándar (cursor + limit)
│   │   │   └── ports/uuid.port.ts         # generación de IDs (inyectable/testeable)
│   │   ├── infrastructure/
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts       # @Global
│   │   │   │   └── prisma.service.ts      # PrismaClient + adapter + hooks de ciclo de vida
│   │   │   ├── redis/
│   │   │   │   ├── redis.module.ts
│   │   │   │   └── redis.service.ts       # caché de saldos, sesiones, rankings
│   │   │   └── events/
│   │   │       └── event-bus.module.ts    # EventEmitter2 configurado
│   │   └── presentation/
│   │       ├── filters/http-exception.filter.ts    # DomainException → HTTP
│   │       ├── interceptors/logging.interceptor.ts # logs estructurados + traceId
│   │       ├── guards/                              # guards genéricos reutilizables
│   │       └── decorators/current-user.decorator.ts
│   │
│   └── modules/
│       │
│       ├── users/                          # BC Identidad — auth JWT + refresh, roles
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   └── usuario.entity.ts
│       │   │   ├── value-objects/
│       │   │   │   ├── email.vo.ts
│       │   │   │   └── password.vo.ts      # política de contraseñas + hash
│       │   │   ├── repositories/
│       │   │   │   └── usuario.repository.ts        # interface (puerto)
│       │   │   └── events/
│       │   │       └── usuario-registrado.event.ts  # dispara bono de registro (ledger)
│       │   ├── application/
│       │   │   ├── services/
│       │   │   │   ├── auth.service.ts              # registro, login, refresh, logout
│       │   │   │   └── usuarios.service.ts          # perfil, consulta (fachada pública)
│       │   │   └── dto/
│       │   │       ├── registrar-usuario.dto.ts
│       │   │       ├── login.dto.ts
│       │   │       └── usuario.response.dto.ts
│       │   ├── infrastructure/
│       │   │   ├── repositories/
│       │   │   │   └── usuario.prisma.repository.ts # implementación del puerto
│       │   │   ├── mappers/
│       │   │   │   └── usuario.mapper.ts            # Prisma ⇄ entidad de dominio
│       │   │   └── auth/
│       │   │       ├── jwt.strategy.ts
│       │   │       ├── jwt-refresh.strategy.ts
│       │   │       └── jwt-auth.guard.ts
│       │   ├── presentation/
│       │   │   └── controllers/
│       │   │       ├── auth.controller.ts           # /auth/register|login|refresh|logout
│       │   │       └── usuarios.controller.ts       # /usuarios/me
│       │   └── users.module.ts             # exporta: UsuariosService, JwtAuthGuard
│       │
│       ├── ledger/                         # BC Economía — corazón transaccional
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   ├── ledger-account.entity.ts
│       │   │   │   ├── ledger-transaction.entity.ts # INVARIANTE: ≥2 asientos, débitos == créditos
│       │   │   │   └── ledger-entry.entity.ts       # INVARIANTE: cantidad > 0
│       │   │   ├── value-objects/
│       │   │   │   ├── cantidad-tickets.vo.ts       # entero positivo
│       │   │   │   └── referencia-polimorfica.vo.ts # (tipo, id)
│       │   │   ├── repositories/
│       │   │   │   └── ledger.repository.ts         # puerto: persistir transacción atómica, calcular saldo
│       │   │   └── events/
│       │   │       └── transaccion-registrada.event.ts
│       │   ├── application/
│       │   │   ├── services/
│       │   │   │   ├── ledger.service.ts            # registrarTransaccion() — ÚNICO ESCRITOR
│       │   │   │   └── billetera.service.ts         # saldo (cache Redis) + historial paginado
│       │   │   └── dto/
│       │   │       ├── registrar-transaccion.dto.ts # contrato interno para otros módulos
│       │   │       ├── saldo.response.dto.ts
│       │   │       └── movimiento.response.dto.ts
│       │   ├── infrastructure/
│       │   │   ├── repositories/
│       │   │   │   └── ledger.prisma.repository.ts  # $transaction serializable + idempotencyKey
│       │   │   └── mappers/
│       │   │       └── ledger.mapper.ts
│       │   ├── presentation/
│       │   │   └── controllers/
│       │   │       └── billetera.controller.ts      # /billetera/saldo, /billetera/movimientos (solo LECTURA)
│       │   └── ledger.module.ts            # exporta: LedgerService (para Gamificación, Marketplace...)
│       │
│       ├── sports/                         # BC Dominio Deportivo — jerarquía abstracta
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   ├── deporte.entity.ts
│       │   │   │   ├── competicion.entity.ts
│       │   │   │   ├── temporada.entity.ts
│       │   │   │   ├── evento.entity.ts
│       │   │   │   └── participante.entity.ts
│       │   │   ├── repositories/
│       │   │   │   ├── deporte.repository.ts
│       │   │   │   ├── competicion.repository.ts
│       │   │   │   ├── temporada.repository.ts
│       │   │   │   ├── evento.repository.ts
│       │   │   │   └── participante.repository.ts
│       │   │   └── events/
│       │   │       └── evento-finalizado.event.ts   # futuro oráculo de Pronósticos
│       │   ├── application/
│       │   │   ├── services/
│       │   │   │   ├── catalogo.service.ts          # deportes, competiciones, temporadas
│       │   │   │   └── eventos.service.ts           # ciclo de vida del Evento + resultados
│       │   │   └── dto/
│       │   ├── infrastructure/
│       │   │   ├── repositories/                    # implementaciones Prisma
│       │   │   └── mappers/
│       │   ├── presentation/
│       │   │   └── controllers/
│       │   │       ├── catalogo.controller.ts       # lectura pública del catálogo
│       │   │       └── eventos.controller.ts        # gestión de eventos (admin)
│       │   └── sports.module.ts
│       │
│       └── gamification/                   # BC Gamificación — motor de reglas (esqueleto en Fase 2)
│           ├── domain/
│           │   ├── entities/                        # Mision, Regla, Logro (modelado en fase posterior)
│           │   ├── repositories/
│           │   └── events/
│           ├── application/
│           │   ├── services/
│           │   │   └── recompensas.service.ts       # escucha eventos de dominio → llama LedgerService
│           │   ├── listeners/
│           │   │   └── usuario-registrado.listener.ts # ej.: bono de registro vía Ledger
│           │   └── dto/
│           ├── infrastructure/
│           ├── presentation/
│           │   └── controllers/
│           └── gamification.module.ts      # importa LedgerModule (usa su fachada, nunca sus tablas)
│
├── test/                                   # e2e por módulo
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## 3. Reglas de dependencia entre módulos

```
users ──(evento: UsuarioRegistrado)──▶ gamification ──(llama)──▶ ledger
sports ──(evento: EventoFinalizado)──▶ gamification / pronósticos (futuro)
ledger ──▶ (nadie)   ← el Ledger no conoce a ningún otro módulo (referencias polimórficas)
```

- `ledger` **no importa** ningún otro módulo de dominio. Recibe `modulo`, `motivo` y `referencia` como datos.
- `gamification` importa `LedgerModule` solo para inyectar `LedgerService` (fachada exportada).
- `users` no conoce al ledger: emite `UsuarioRegistradoEvent`; el bono de registro lo orquesta `gamification` (o un listener propio de `ledger` si se prefiere — a decidir en implementación).
- Prohibido el import cruzado de `domain/` o `infrastructure/` de otro módulo (se refuerza con regla de ESLint `no-restricted-imports` por carpeta).

## 4. Contrato clave: `LedgerService.registrarTransaccion()`

Firma propuesta (pendiente en `05_estado_del_proyecto.md`, se implementará tras aprobación):

```ts
interface RegistrarTransaccionInput {
  modulo: ModuloSistema;            // enum del schema
  motivo: MotivoTransaccion;
  descripcion?: string;
  referencia?: { tipo: string; id: string };
  idempotencyKey: string;           // obligatoria: la provee el módulo emisor
  asientos: Array<{
    cuenta: { tipo: 'USUARIO'; usuarioId: string } | { tipo: 'SISTEMA'; codigo: string };
    direccion: 'DEBITO' | 'CREDITO';
    cantidad: number;               // entero > 0
  }>;
}

// Garantías del servicio:
// 1. Valida invariantes de dominio (cuadre a cero, cantidad > 0, ≥2 asientos).
// 2. Verifica saldo suficiente en cuentas USUARIO (aislamiento Serializable).
// 3. Escribe transacción + asientos en un único prisma.$transaction.
// 4. Idempotente: si idempotencyKey ya existe, devuelve la transacción original.
// 5. Invalida el saldo cacheado en Redis de las cuentas afectadas.
// 6. Emite TransaccionRegistradaEvent.
```

## 5. Convenciones

| Aspecto | Convención |
|---|---|
| Idioma | Entidades y conceptos de dominio en **español** (coherente con el schema); carpetas y artefactos técnicos en inglés (`controllers`, `services`) |
| Nombres de archivo | `kebab-case` + sufijo de rol: `.entity.ts`, `.vo.ts`, `.repository.ts`, `.service.ts`, `.controller.ts`, `.dto.ts`, `.mapper.ts`, `.event.ts`, `.listener.ts` |
| Inyección de repositorios | Token `Symbol`/string por interface (ej. `USUARIO_REPOSITORY`) definido junto al puerto |
| DTOs | `class-validator` + `class-transformer`; `ValidationPipe` global con `whitelist: true` |
| API | Prefijo global `/api/v1` (versionado de NestJS) |
| Errores | Los servicios lanzan `DomainException`; el filter global las mapea a HTTP |
| Tests | Unitarios junto al código (`*.spec.ts`, dominio sin NestJS ni BD); e2e en `/test` |

## 6. Alcance exacto de la Fase 2 (al aprobarse esta propuesta)

1. Scaffold del proyecto NestJS + estructura de carpetas anterior.
2. `shared/` completo (Prisma 7 con adapter, Redis, config validada, filters/interceptors).
3. Migración inicial (`prisma migrate dev`) desde el schema aprobado.
4. Módulo `users` funcional: registro, login, JWT + refresh, guard.
5. Módulo `ledger` funcional: `registrarTransaccion()` con todas las garantías del §4, saldo e historial de billetera.
6. Módulo `sports`: CRUD del catálogo y eventos (lectura pública, escritura admin).
7. Módulo `gamification`: esqueleto + listener de bono de registro (prueba end-to-end del Ledger).

**Fuera de alcance Fase 2:** motor de reglas de gamificación completo, pronósticos, marketplace, reservas.

---

## ⏸️ Punto de control

Propuesta lista. **Esperando aprobación antes de crear cualquier archivo `.ts` o ejecutar comandos de instalación.** Al aprobarse, se actualizará `05_estado_del_proyecto.md` y comenzará el scaffold.
