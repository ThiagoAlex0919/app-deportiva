/* eslint-disable @next/next/no-img-element */
import type { Noticia } from "@/lib/api";

/**
 * Tarjeta de noticia según referencias_ui/belgica-noticas.jpeg (OneFootball):
 * título bold a la izquierda, imagen redondeada a la derecha, fila inferior
 * con fuente + antigüedad. Abre el medio original en pestaña nueva — el
 * crédito a la fuente es parte del trato del agregador (doc 11).
 * <img> nativo (no next/image): dominios de imagen impredecibles por RSS.
 */
export function NewsCard({ noticia }: { noticia: Noticia }) {
  return (
    <a
      href={noticia.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 rounded-card bg-surface p-4 transition-colors active:bg-surface-raised lg:hover:bg-surface-raised"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="line-clamp-3 text-[16px] font-bold leading-snug">
          {noticia.titulo}
        </h3>
        <p className="mt-auto text-[13px] text-foreground-secondary">
          <span className="font-semibold text-foreground">
            {noticia.fuente}
          </span>{" "}
          · {haceCuanto(noticia.publicadaEn)}
        </p>
      </div>
      {noticia.imagenUrl && (
        <img
          src={noticia.imagenUrl}
          alt=""
          loading="lazy"
          className="size-24 shrink-0 rounded-row object-cover"
        />
      )}
    </a>
  );
}

/** "hace 2 h", "hace 3 d" — suficiente para un feed. */
function haceCuanto(iso: string): string {
  const minutos = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  if (minutos < 60) return `hace ${minutos || 1} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}
