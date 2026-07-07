"use client";

import type { EventoCatalogo } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Tarjeta compacta de partido para el tablero con tabs (rediseño):
 * SIEMPRE vertical y de alto fijo — en mobile viaja en carrusel horizontal,
 * en desktop vive en un grid de 3-4 columnas que aprovecha el ancho.
 * La seleccionada lleva anillo blanco (patrón chip del design system).
 */
export function StoryCard({
  evento,
  seleccionado,
  onClick,
}: {
  evento: EventoCatalogo;
  seleccionado: boolean;
  onClick: () => void;
}) {
  const esEquipos = evento.deporte.formato === "EQUIPOS";
  const local = evento.participantes.find((p) => p.rol === "LOCAL");
  const visitante = evento.participantes.find((p) => p.rol === "VISITANTE");
  const titulo = esEquipos
    ? `${abrev(local?.nombre)} vs ${abrev(visitante?.nombre)}`
    : evento.nombre.replace("Gran Premio", "GP");
  const fecha = new Date(evento.fechaInicio);
  const enVivo = evento.estado === "EN_VIVO";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-44 shrink-0 snap-start flex-col justify-between gap-1.5 rounded-row bg-surface p-3 text-left transition-colors lg:w-auto lg:shrink",
        seleccionado
          ? "ring-[1.5px] ring-foreground"
          : "active:bg-surface-raised lg:hover:bg-surface-raised",
      )}
    >
      <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
        {evento.competicion.nombre}
      </span>
      <span className="line-clamp-2 text-[14px] font-bold leading-tight">
        {titulo}
      </span>
      {enVivo ? (
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 animate-pulse rounded-full bg-live" />
          {evento.marcador ? (
            <span className="nums text-[14px] font-black">
              {evento.marcador[0]}-{evento.marcador[1]}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-live">EN VIVO</span>
          )}
        </span>
      ) : (
        <span className="text-[12px] text-foreground-secondary">
          {fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
          {" · "}
          {fecha.toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
      )}
    </button>
  );
}

/** "Real Madrid" → "R. Madrid"; nombres cortos quedan igual. */
function abrev(nombre?: string): string {
  if (!nombre) return "?";
  const partes = nombre.split(" ");
  if (partes.length === 1 || nombre.length <= 10) return nombre;
  return `${partes[0][0]}. ${partes.slice(1).join(" ")}`;
}
