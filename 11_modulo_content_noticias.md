# 11 — Módulo Content: Noticias vía RSS (Diseño)

> **Estado:** 🟡 Propuesta pendiente de aprobación. Sin código todavía (regla 3 de `03_instrucciones_fable5.md`).
> Alimenta el feed de noticias del Home (04_sitemap_y_ux.md §1.A) con agregación RSS de medios deportivos — gratis, legal (titular + resumen + imagen + link con crédito a la fuente) y extensible a APIs pagas o contenido propio sin rehacer nada.

## 1. Modelo (nuevo en schema.prisma)

```prisma
model Noticia {
  id          String   @id @default(uuid())
  titulo      String
  resumen     String?  // descripción corta del feed (texto plano)
  url         String   @unique // link canónico al medio — CLAVE DE DEDUPE
  imagenUrl   String?
  fuente      String   // "Marca", "AS", "Mundo Deportivo"...
  deporteSlug String?  // tag simple ("futbol", "formula-1"); FK real llegará con favoritos
  publicadaEn DateTime
  createdAt   DateTime @default(now())

  @@index([publicadaEn(sort: Desc)])
  @@map("noticias")
}
```

## 2. Fuentes en config editable (mismo patrón que recompensas)

`backend/config/fuentes-rss.json` — añadir/quitar medios sin tocar código:

```jsonc
[
  { "nombre": "Marca", "url": "https://e00-marca.uecdn.es/rss/futbol/primera-division.xml", "deporteSlug": "futbol" },
  { "nombre": "Mundo Deportivo", "url": "https://www.mundodeportivo.com/rss/home.xml", "deporteSlug": "futbol" },
  { "nombre": "BBC Sport", "url": "https://feeds.bbci.co.uk/sport/football/rss.xml", "deporteSlug": "futbol" },
  { "nombre": "Motorsport", "url": "https://es.motorsport.com/rss/f1/news/", "deporteSlug": "formula-1" }
]
```

⚠️ URLs de arranque razonables pero **a validar en producción**: una fuente caída/cambiada se ignora con log (nunca tumba el feed) y se corrige editando el JSON.

## 3. Backend — ContentModule

- **`RssAgregadorService`**: descarga los feeds en paralelo (timeout 5s por fuente, `rss-parser`), normaliza (título, resumen sin HTML, imagen de `enclosure`/`media:content`, fecha) y hace upsert por `url` — re-ejecutar nunca duplica.
- **Refresco on-demand con caché**: `GET /content/news` refresca si la última agregación tiene >15 min (marca de tiempo en memoria). Sin cron ni dependencias nuevas de scheduling: el keep-alive existente (ping cada 10 min) pasa a apuntar a este endpoint, con lo que el feed se mantiene fresco solo.
- **`GET /api/v1/content/news?deporte=&cursor=&limit=`** — `@Public()`, orden `publicadaEn desc`, paginación por cursor.
- Dependencia nueva: `rss-parser` (~30 KB, sin binarios).

## 4. Frontend — Home

- **`NewsCard`** según `referencias_ui/belgica-noticas.jpeg`: título bold a la izquierda, imagen redondeada a la derecha, fila inferior con fuente + "hace 2 h"; toda la tarjeta abre el medio en pestaña nueva (crédito siempre visible).
- Sección "Noticias" bajo el grid del Home (ancho completo en desktop), con skeletons, error y empty; botón "Ver más" con cursor.

## 5. Futuro ya contemplado

Favoritos → filtro del feed por equipos/deportes del usuario ("Mi Ecosistema" real). Fuentes de API paga o notas editoriales propias = más filas en `Noticia` con otra `fuente`, cero cambios de contrato.

## 6. Plan al aprobar

1. Schema `Noticia` + config de fuentes + ContentModule (agregador + endpoint)
2. Frontend: NewsCard + sección en Home
3. Keep-alive apuntando a `/content/news`
4. Push → deploy → validar fuentes reales en producción → doc 05
