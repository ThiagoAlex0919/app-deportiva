# Instrucciones de Ejecución para Fable 5

Actúa como Arquitecto de Software Principal y Desarrollador Full-Stack Senior. Tu objetivo es estructurar el código inicial de esta plataforma deportiva basándote estrictamente en los documentos `01_vision_y_stack.md` y `02_modelo_de_dominio.md`.

## Reglas Estrictas de Operación:
1. **Documentación Markdown:** Todo análisis, diagrama de arquitectura y explicación de dependencias debe guardarse en archivos `.md` dentro de este directorio. No generes respuestas largas en el chat.
2. **Claridad y Control:** Cada decisión técnica, configuración de Prisma, o componente de Next.js generado debe incluir comentarios exhaustivos en el código explicando *por qué* se diseñó así.
3. **Pausas de Aprobación:** Ejecutarás el trabajo en fases. Al terminar una fase, te detendrás y solicitarás explícitamente mi aprobación antes de continuar.

## Plan de Ejecución (Fases):
- **Fase 1:** Genera el esquema inicial de la base de datos `schema.prisma` enfocado en el modelo de dominio abstracto y el sistema Ledger de tickets.
- **Fase 2:** Inicializa la estructura de carpetas del backend en NestJS aplicando DDD para los dominios de Gamificación y Usuarios.
- **Fase 3:** Configura la estructura base del frontend en Next.js, integrando Tailwind, Shadcn/UI y la configuración PWA.