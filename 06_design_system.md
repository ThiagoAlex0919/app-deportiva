# 06 — Design System (Frontend PWA)

> **Fuente:** Análisis visual de las 13 referencias en `referencias_ui/` (estética tipo OneFootball, dark mode) + lineamientos de `04_sitemap_y_ux.md` (paleta neutra, acento vibrante SOLO para Tickets y CTAs).
> **Estado:** 🟡 Pendiente de aprobación formal. No se ha escrito código ni ejecutado instalaciones.

---

## 1. Análisis visual de las referencias

**Patrones consistentes en todas las pantallas:**

| Aspecto | Observación |
|---|---|
| Fondo | Negro puro (`#000`) como base; las superficies elevadas se diferencian por tono, no por sombra |
| Tarjetas | Gris muy oscuro (~`#1A1A1E`), radio generoso (12–16px), **sin bordes ni sombras visibles**. La elevación se comunica solo con contraste de superficie |
| Acento | Amarillo-lima (anillo del avatar, borde del pill de votación, gradiente oliva de la tarjeta de partido destacada). Usado con extrema moderación → coincide con nuestra regla: acento = Tickets + CTAs |
| Estado "en vivo" | Rojo/rosa (borde de tarjeta + texto "En directo") |
| Resultados | Barra vertical a la derecha del marcador: verde = victoria, gris = empate/derrota |
| Tipografía | Sans-serif geométrica (estilo SF Pro). Jerarquía por **peso**, no por color: títulos bold/extrabold, marcadores y horas en black, secundarios en gris medio |
| Navegación | Bottom Tab Bar negro: icono + label, blanco activo / gris inactivo. Páginas de detalle: tabs horizontales scrolleables con subrayado blanco de 2–3px en la activa |
| Chips/Pills | Filtros como pills: activa con borde blanco 1.5px sobre fondo transparente; inactivas fondo gris oscuro sin borde |
| Listas | Filas label-izquierda / valor-derecha dentro de tarjetas; separadores hairline (~8% blanco); headers de sección en MAYÚSCULAS, pequeños, grises |
| Bottom Sheets | Fondo `#1A1A1E`, handle superior, avatares circulares de entidades (con badge de corazón), botones full-width: primario blanco pill, secundario gris oscuro pill |
| Heros de detalle | Jugador: banda con color del equipo + avatar circular grande a la derecha. Equipo: escudo + nombre grande sobre negro |
| Espaciado | Padding lateral de página ~16px; gap entre tarjetas ~12px; padding interno de tarjeta ~16px |
| Densidad | Mobile first estricto, una columna, scroll vertical + carruseles horizontales (stories de partidos, últimos resultados) |

---

## 2. Paleta de colores (Tailwind)

Filosofía: **neutros al 95%**. El amarillo-lima (`ticket`) se reserva EXCLUSIVAMENTE para el saldo/economía de Tickets y CTAs primarios (psicología de recompensa, `04_sitemap_y_ux.md`).

```ts
// tailwind.config.ts → theme.extend.colors
colors: {
  // Superficies (escala de elevación, de fondo a flotante)
  background: '#000000',        // fondo de página
  surface: {
    DEFAULT: '#141416',         // tarjetas nivel 1
    raised:  '#1C1C1F',         // tarjetas nivel 2 / filas internas
    overlay: '#232327',         // bottom sheets, dropdowns, inputs
  },
  border: 'rgba(255,255,255,0.08)',  // separadores hairline

  // Texto
  foreground: {
    DEFAULT: '#FFFFFF',         // títulos, valores
    secondary: '#A1A1AA',       // subtítulos, labels, metadatos
    muted: '#63636B',           // deshabilitado, placeholders
  },

  // Acento de recompensa — SOLO Tickets y CTA principal
  ticket: {
    DEFAULT: '#D6F930',         // amarillo-lima vibrante
    foreground: '#0A0A0A',      // texto sobre fondo ticket
    muted: 'rgba(214,249,48,0.12)', // fondos sutiles (badges de saldo)
  },

  // Semánticos (uso funcional, nunca decorativo)
  live:    '#FF2E63',           // eventos en directo (borde + texto)
  success: '#22C55E',           // victoria, acierto de pronóstico, crédito en billetera
  danger:  '#EF4444',           // errores, débito destacado, SALDO_INSUFICIENTE
  warning: '#F59E0B',           // estados pendientes
}
```

**Reglas de uso:**

1. Ningún componente decorativo usa `ticket`. Si un elemento amarillo no representa Tickets ni es el CTA primario de la vista, está mal.
2. Un solo CTA `ticket` por pantalla (máximo). Botones secundarios = blanco pill o `surface.raised`.
3. `live`, `success`, `danger` solo comunican estado, nunca marca.
4. Elevación por tono de superficie; **prohibidas las sombras** (`shadow-none` global).

### Tipografía

```ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'], // vía next/font, variable
}
```

| Token | Uso | Especificación |
|---|---|---|
| `display` | Marcadores, hora del partido, saldo de Tickets | 28–36px / font-black / tabular-nums |
| `title` | Títulos de página, nombre de equipo/jugador | 22–24px / font-bold |
| `heading` | Títulos de tarjeta y noticia | 17–18px / font-bold |
| `body` | Texto general, filas de lista | 15px / font-normal |
| `label` | Headers de sección | 12px / font-semibold / uppercase / tracking-wide / foreground-secondary |
| `caption` | Metadatos, timestamps | 13px / foreground-secondary |

Números económicos y marcadores siempre con `tabular-nums`.

### Espaciado y radios

| Token | Valor | Uso |
|---|---|---|
| Padding de página | `px-4` (16px) | contenedor global mobile |
| Gap entre tarjetas | `gap-3` (12px) | listas verticales |
| Padding de tarjeta | `p-4` (16px) | interior |
| `rounded-card` | 16px | tarjetas |
| `rounded-row` | 12px | filas internas, inputs |
| `rounded-full` | pill | botones, chips, avatares |
| Bottom Tab Bar | 64px + safe-area | fijo inferior |

---

## 3. Configuración base de Shadcn/UI

`components.json`:

```json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": { "components": "@/components", "utils": "@/lib/utils" }
}
```

Variables CSS (`globals.css`) — **dark es el único tema**, se define en `:root` sin clase `.dark`:

```css
:root {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --card: 240 4% 8%;              /* #141416 */
  --card-foreground: 0 0% 100%;
  --popover: 240 5% 14%;          /* #232327 */
  --popover-foreground: 0 0% 100%;
  --primary: 70 94% 55%;          /* ticket #D6F930 */
  --primary-foreground: 0 0% 4%;
  --secondary: 240 4% 11%;        /* #1C1C1F */
  --secondary-foreground: 0 0% 100%;
  --muted: 240 4% 11%;
  --muted-foreground: 240 4% 64%; /* #A1A1AA */
  --accent: 240 4% 11%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 100% / 0.08;
  --input: 240 5% 14%;
  --ring: 70 94% 55%;
  --radius: 1rem;                 /* 16px */
}
```

Componentes Shadcn a instalar en Fase 1: `button`, `card`, `tabs`, `badge`, `avatar`, `drawer` (bottom sheets, con Vaul), `dropdown-menu` (selector Mi Ecosistema/Mundo Deportivo), `input`, `skeleton`, `sonner` (toasts de error del Ledger), `separator`, `scroll-area`.

---

## 4. Estructura de componentes reutilizables

Organización propuesta (`src/components/`):

```
components/
├── ui/            # primitivas Shadcn (generadas, personalizadas con tokens)
├── layout/        # AppShell, BottomTabBar, PageHeader, EntityTabs
├── cards/         # MatchCard, NewsCard, StatCard, StoryCard
├── economy/       # TicketBalance, TicketTransactionRow, TicketBadge
├── gamification/  # PredictionWidget, MissionCard
└── shared/        # EntityAvatar, LivePill, ResultBar, SectionHeader, FilterChips
```

### 4.1 Botones (variantes sobre `ui/button`)

| Variante | Estilo | Uso |
|---|---|---|
| `cta` | fondo `ticket`, texto casi negro, pill, full-width opcional | Acción primaria (ej. "Confirmar pronóstico — 50 🎟") |
| `primary` | fondo blanco, texto negro, pill | Acción principal no económica ("VER TODOS") |
| `secondary` | fondo `surface.raised`, texto blanco, pill | Acción alternativa ("FINALIZAR") |
| `ghost` | transparente, texto `foreground.secondary` | Acciones terciarias, "Ver todos" en línea |
| `chip` | pill pequeña; activa: borde blanco 1.5px; inactiva: fondo `surface.raised` | Filtros de feed ("Para ti", "Top News") |

### 4.2 Tarjetas de Partido

- **`MatchCard`** (destacado, tipo hero): competición + fecha, banderas/escudos grandes, hora o marcador en `display`, menú contextual. Estado `live` con borde `live`. Slot inferior para `PredictionWidget`.
- **`MatchRow`** (lista compacta, vista Partidos): header de fecha, dos filas equipo+marcador, `ResultBar` vertical (success/muted) y estado ("Final del partido" / hora).
- **`StoryCard`** (carrusel horizontal superior del Home): mini tarjeta con icono/banderas, título y subtítulo; variante `live` con borde `live`.
- **`PredictionWidget`** ("¿Quién ganará?"): pill segmentada de 3 opciones (local/empate/visita) + contador de votos. Selección con borde `ticket` → conecta con `POST /api/v1/gamification/predictions` (modalidad `GANADOR`; el diseño admite otras modalidades vía `tipo` + `payload`).

### 4.3 Tarjetas de Tickets (Billetera — APIs ya operativas)

- **`TicketBalance`** (hero de Billetera): saldo en `display` + icono Ticket en color `ticket`, sobre gradiente sutil `ticket.muted`. Consume `GET /api/v1/ledger/balance`. Único lugar con acento a gran escala.
- **`TicketTransactionRow`**: fila de historial — icono del módulo emisor (`ModuloSistema`), concepto, timestamp (`caption`), monto a la derecha con `tabular-nums`: crédito `success` (+), débito `foreground` (−). Consume `GET /api/v1/ledger/history` con scroll infinito por cursor.
- **`TicketBadge`**: pill compacta (icono + cantidad) para mostrar costos/recompensas en cualquier vista (ej. costo de un pronóstico, recompensa de misión).

### 4.4 Layout y navegación

- **`AppShell`**: contenedor mobile-first (max-w ~480px centrado en desktop), fondo `background`, safe-areas PWA.
- **`BottomTabBar`**: 5 tabs fijos según `04_sitemap_y_ux.md` (Home, Zona de Juego, Billetera, Tienda, Perfil). Icono + label 11px; activo blanco, inactivo `muted`.
- **`PageHeader`**: variante Home (avatar + título + búsqueda + dropdown Mi Ecosistema/Mundo Deportivo) y variante detalle (back + acciones).
- **`EntityTabs`**: tabs horizontales scrolleables con subrayado blanco (páginas de equipo/jugador y secciones internas).
- **`SectionHeader`**: label uppercase + acción "Ver todos" opcional.
- **`EntityAvatar`**: avatar circular sobre fondo `surface.raised`, tamaños sm/md/lg, badge opcional (favorito).
- **`StatRow` / `StatCard`**: fila label/valor y tarjeta de agrupación para estadísticas.

### 4.5 Estados obligatorios

Todo componente que consume API define tres estados: **loading** (`Skeleton` con las mismas dimensiones), **error** (mensaje del contrato `{ statusCode, codigo, mensaje }` — ej. `SALDO_INSUFICIENTE` → toast `danger`), y **empty** (icono + texto `foreground.secondary` + CTA opcional).

---

## 5. Alcance de la Fase 1 y siguiente paso

Con este sistema aprobado, la Fase 1 del frontend construiría: scaffold Next.js (App Router, PWA), tokens + config Shadcn, `AppShell` + `BottomTabBar`, y la vertical de **Billetera** (`TicketBalance` + historial) como primera pantalla conectada a las 2 APIs de lectura operativas, más `PredictionWidget` contra `POST /gamification/predictions`.

**⛔ Regla de parada activa:** sin instalación ni `.tsx` hasta aprobación formal de este documento.
