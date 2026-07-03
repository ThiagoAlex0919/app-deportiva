# Arquitectura de la Información y Sitemap (Frontend PWA)

La interfaz debe diseñarse bajo un enfoque Mobile First, simulando la experiencia de una aplicación nativa. La navegación principal se gestionará a través de un Bottom Tab Bar y contextos superiores.

## 1. Navegación Principal (Bottom Tab Bar)
La plataforma se divide en 5 módulos principales accesibles desde la navegación inferior:

### A. Home (Feed y Contenido)
- **Header dinámico:** Debe incluir un selector (Dropdown / Segmented Control) que permita al usuario alternar entre dos vistas:
  1. **Mi Ecosistema:** Feed hiper-personalizado (noticias, resultados, videos) basado en los equipos, selecciones y deportes favoritos del usuario.
  2. **Mundo Deportivo:** Información general, tendencias y eventos de alto impacto global fuera de sus preferencias.

### B. Zona de Juego (Gamificación y Pronósticos)
- Centro de interacción donde el usuario participa para ganar Tickets.
- **Secciones:** Misiones diarias, Pronósticos de próximos partidos, y acceso a competencias comunitarias ("Pollas").

### C. Billetera y Recompensas (Wallet / Redemption)
- Panel de control de la economía del usuario.
- **Secciones:** Saldo actual de Tickets, historial transaccional (conectado al Ledger del backend) y catálogo de redención (beneficios, indumentaria, descuentos).

### D. Tienda y Escenarios (Marketplace)
- Punto de encuentro comercial.
- **Secciones:** E-commerce de artículos deportivos y sistema de descubrimiento/reserva de canchas y escenarios deportivos.

### E. Perfil y Comunidad (Social)
- **Secciones:** Gestión de preferencias (selección de deportes/equipos), estadísticas de acierto en pronósticos, configuración de cuenta y rankings de la comunidad.

## 2. Lineamientos de UX/UI
- **Estética:** Diseño limpio, minimalista y premium. Modo oscuro por defecto.
- **Jerarquía Visual:** Uso de paletas neutras, reservando colores de acento vibrantes única y exclusivamente para los "Tickets" y los Call to Action (CTAs) principales, reforzando la psicología de recompensa.