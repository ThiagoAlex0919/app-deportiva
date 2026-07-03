# Modelo de Dominio y Reglas de Negocio

El sistema NO debe modelarse alrededor de un deporte específico. El concepto raíz es la entidad abstracta `Deporte`.
Jerarquía obligatoria: `Deporte` -> `Competición` -> `Temporada` -> `Evento/Jornada` -> `Participante` (Equipos, atletas, pilotos, etc.).

## 1. Economía Digital (El Ledger)
- La moneda interna es el "Ticket".
- **Regla Estricta:** Los tickets NO son un campo estático de saldo en la tabla de usuarios. 
- Toda operación de tickets debe ser transaccional usando un modelo Ledger de doble entrada.
- Campos mínimos del Ledger: origen, motivo, fecha, usuario, referencia, módulo responsable, cantidad.

## 2. Gamificación Transversal
- Motor de reglas configurable administrado en el backend.
- Debe soportar la emisión de eventos de sistema desde cualquier módulo (registro, consumo de contenido, pronósticos, compras) para otorgar recompensas en Tickets.

## 3. Pronósticos y Desafíos
- Sistema flexible para crear múltiples tipos de desafíos asociados a cualquier evento deportivo.
- Resolución automatizada de recompensas basada en oráculos de datos o información oficial.

## 4. Módulos Independientes (Desacoplados)
- **Marketplace:** Gestión de inventario y pedidos independiente. Los tickets interactúan aquí solo como mecanismo de descuento o método de pago.
- **Reserva de Escenarios:** Gestión multisede y multideporte de disponibilidad y horarios.
- **Contenido:** Consumo de datos mediante APIs provenientes de un Headless CMS.