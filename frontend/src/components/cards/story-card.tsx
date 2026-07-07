"use client";

import type { EventoCatalogo } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Tarjeta del selector de eventos.
 * Mobile: tarjeta compacta de carrusel horizontal.
 * Desktop: FILA compacta (competición+partido a la izquierda, fecha a la
 * derecha) — la lista respira menos y se escanea más rápido (pedido UX).
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
        "shrink-0 snap-start rounded-row bg-surface text-left transition-colors",
        // Mobile: mini-card de carrusel · Desktop: fila compacta
        "flex w-40 flex-col gap-0.5 p-3",
        "lg:w-full lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:px-3 lg:py-2.5",
        seleccionado
          ? "ring-[1.5px] ring-foreground"
          : "active:bg-surface-raised lg:hover:bg-surface-raised",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
          {evento.competicion.nombre}
        </span>
        <span className="block truncate text-[14px] font-bold leading-tight">
          {titulo}
        </span>
      </span>
      {evento.estado === "EN_VIVO" ? (
        <span className="flex shrink-0 items-center gap-1.5">
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
        <span className="shrink-0 text-[12px] text-foreground-secondary">
          {fecha}
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
