# Visión del Proyecto y Stack Tecnológico

## Visión General
Desarrollo de una plataforma SaaS deportiva diseñada como un ecosistema digital interactivo. No es una app de resultados, es un modelo de retención basado en gamificación (Redemption Games), economía de tickets, contenido centralizado, comercio electrónico y reserva de escenarios. 

## Filosofía de Arquitectura
- **Domain-Driven Design (DDD)** y **Clean Architecture**.
- Separación estricta de responsabilidades (Separation of Concerns).
- Backend modular preparado para futura transición a microservicios.
- Escalabilidad vertical y horizontal. Diseño "Mobile First" y accesible (WCAG).

## Stack Tecnológico Requerido
### Frontend (PWA)
- **Framework:** Next.js (React) con TypeScript.
- **Estilos y UI:** Tailwind CSS, Shadcn/UI, Design System personalizado.
- **Gestión de Estado:** TanStack Query (estado servidor) y Zustand (estado cliente).

### Backend (Monolito Modular)
- **Framework:** NestJS con TypeScript.
- **Base de Datos Principal:** PostgreSQL.
- **ORM:** Prisma.
- **Caché y Alta Velocidad:** Redis (para sesiones, rankings, resultados en tiempo real).
- **Almacenamiento:** Amazon S3 (o compatible).

### Infraestructura y Seguridad
- **Autenticación:** JWT y Refresh Tokens.
- **Seguridad:** Protección CSRF, XSS, SQL Injection. Roles y permisos granulares.
- **Observabilidad:** Logs estructurados y trazabilidad distribuida.