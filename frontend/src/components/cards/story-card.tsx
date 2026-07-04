"use client";

import type { EventoCatalogo } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Tarjeta compacta del carrusel de eventos (estilo stories de referencias_ui).
 * La seleccionada lleva anillo blanco de 1.5px (patrón chip del design system).
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
  const fecha = new Date(evento.fechaInicio).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-36 shrink-0 snap-start flex-col gap-1 rounded-card bg-surface p-3 text-left transition-colors lg:w-full lg:shrink",
        seleccionado
          ? "ring-[1.5px] ring-foreground"
          : "active:bg-surface-raised",
      )}
    >
      <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-foreground-secondary">
        {evento.competicion.nombre}
      </span>
      <span className="line-clamp-2 text-[15px] font-bold leading-tight">
        {titulo}
      </span>
      <span className="text-[13px] text-foreground-muted">{fecha}</span>
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
