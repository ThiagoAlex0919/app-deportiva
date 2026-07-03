# 07 — Módulo Users: Autenticación JWT (Diseño)

> **Estado:** 🟡 Propuesta pendiente de aprobación. Sin código todavía (regla 3 de `03_instrucciones_fable5.md`).
> Resuelve la deuda técnica #1 del doc 05: `usuarioId` viajando por query/body.

## 1. Alcance

**Backend (NestJS, módulo `users` con la misma estructura DDD de `ledger/`):**

| Endpoint (`api/v1`) | Descripción |
|---|---|
| `POST /auth/register` | Crea usuario (email + password + nombre). Otorga **bono de bienvenida de 500 Tickets** vía `LedgerService` (idempotente por `idempotencyKey = bono:<usuarioId>`). Devuelve tokens. |
| `POST /auth/login` | Valida credenciales → `accessToken` + `refreshToken`. |
| `POST /auth/refresh` | Rota el refresh token (el usado se revoca) → par nuevo. |
| `POST /auth/logout` | Revoca el refresh token activo. |
| `GET /users/me` | Perfil del usuario autenticado (requiere access token). |

**Protección de endpoints existentes (breaking change coordinado):**
`GET /ledger/balance`, `GET /ledger/history` y `POST /gamification/predictions` pasan a requerir `Authorization: Bearer <accessToken>`; el `usuarioId` sale del token (`@CurrentUser()`) y **se elimina de query/body** como estaba planeado.

**Frontend (Next.js):**
Páginas `/login` y `/registro` (formularios con los tokens del design system), store de sesión en Zustand (access token en memoria, refresh en `localStorage`), cliente API con header `Authorization` y reintento automático vía refresh en 401, redirect a `/login` si no hay sesión, y el Perfil muestra el usuario real con logout. Desaparece `USUARIO_DEMO_ID` hardcodeado.

## 2. Decisiones técnicas

1. **Tokens:** access JWT de 15 min (firmado con `JWT_SECRET`) + refresh opaco de 7 días **persistido como hash SHA-256** en tabla `RefreshToken` con rotación en cada uso y revocación en logout. Un refresh robado deja de servir en cuanto el legítimo rota.
2. **Passwords:** `bcryptjs` (sin binarios nativos — simplifica el build en Render), costo 10.
3. **Guard global `JwtAuthGuard`** + decorator `@Public()` para las rutas de auth. Evita olvidar proteger endpoints nuevos (secure-by-default).
4. **El seed sigue funcionando:** los usuarios demo/tester reciben `passwordHash` de `demo1234` para poder iniciar sesión en la app desplegada.
5. **Dependencias nuevas:** `@nestjs/jwt`, `bcryptjs` (+ `@types/bcryptjs`). Sin Passport: un guard propio de ~30 líneas es suficiente y más transparente.

## 3. Cambios de schema (requieren aprobación)

```prisma
model Usuario {
  // ... campos actuales sin cambios ...
  passwordHash  String?        // nullable: usuarios pre-auth (seed) siguen válidos
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String    @id @default(uuid())
  usuarioId String
  usuario   Usuario   @relation(fields: [usuarioId], references: [id])
  tokenHash String    @unique   // SHA-256 del token opaco; nunca se guarda en claro
  expiresAt DateTime
  revokedAt DateTime?           // null = activo; rotación y logout lo marcan
  createdAt DateTime  @default(now())

  @@index([usuarioId])
  @@map("refresh_tokens")
}
```

En producción lo aplica el `db push` del arranque de Render; la migración formal sigue pendiente para el entorno local (doc 05 §1).

## 4. Variables de entorno nuevas

| Variable | Uso | Render |
|---|---|---|
| `JWT_SECRET` | Firma del access token | `generateValue: true` en render.yaml |
| `JWT_ACCESS_TTL` | Opcional, default `15m` | — |

## 5. Plan de ejecución al aprobar

1. Schema + `db push`/seed actualizados
2. Módulo `users` completo (domain/application/infrastructure/presentation)
3. Guard global + `@CurrentUser` + limpieza de DTOs de ledger/gamification
4. Frontend: store de sesión, cliente API con Bearer + refresh, `/login`, `/registro`, Perfil real
5. Deploy + verificación end-to-end en producción (registro → bono 500 → pronóstico → billetera)
6. Actualización del doc 05
