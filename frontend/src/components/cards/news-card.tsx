/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Noticia } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Tarjetas de noticia IMAGEN-PROTAGONISTA (rediseño pedido sobre doc 11):
 * la imagen es el fondo, un gradiente oscuro garantiza contraste y el
 * titular vive encima. Navegan a la página interna /noticia/[id]
 * (el link al medio original vive allí, con crédito).
 *
 * `variant`:
 *  - "hero": tarjeta grande del bento (título display, resumen visible)
 *  - "tile": tarjeta estándar de grid
 * <img> nativo (no next/image): dominios de imagen impredecibles por RSS.
 */
export function NewsCard({
  noticia,
  variant = "tile",
  className,
}: {
  noticia: Noticia;
  variant?: "hero" | "tile";
  className?: string;
}) {
  const esHero = variant === "hero";
  return (
    <Link
      href={`/noticia/${noticia.id}`}
      className={cn(
        "group relative flex flex-col justify-end overflow-hidden rounded-card bg-surface",
        esHero ? "min-h-72 lg:min-h-full" : "min-h-56",
        className,
      )}
    >
      {/* Imagen de fondo + gradiente de legibilidad */}
      {noticia.imagenUrl ? (
        <img
          src={noticia.imagenUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-surface-overlay to-surface" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      {/* Contenido sobre la imagen */}
      <div className={cn("relative flex flex-col gap-2", esHero ? "p-5" : "p-4")}>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground-secondary">
          {noticia.fuente} · {haceCuanto(noticia.publicadaEn)}
        </span>
        <h3
          className={cn(
            "font-bold leading-snug",
            esHero
              ? "line-clamp-3 text-xl lg:text-2xl"
              : "line-clamp-3 text-[15px]",
          )}
        >
          {noticia.titulo}
        </h3>
        {esHero && noticia.resumen && (
          <p className="line-clamp-2 hidden text-sm text-foreground-secondary lg:block">
            {noticia.resumen}
          </p>
        )}
      </div>
    </Link>
  );
}

/** "hace 2 h", "hace 3 d" — suficiente para un feed. */
export function haceCuanto(iso: string): string {
  const minutos = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  if (minutos < 60) return `hace ${minutos || 1} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}
