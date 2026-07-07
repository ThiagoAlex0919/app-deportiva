"use client";

/* eslint-disable @next/next/no-img-element */
import type { EventoCatalogo, ParticipanteEvento } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de partido estilo OneFootball (referente aprobado 2026-07-06):
 * banderas/escudos CIRCULARES apilados con el nombre (y goles si los hay)
 * a la izquierda, y columna de fecha/hora separada por divisor a la derecha.
 * Mobile: carrusel horizontal · Desktop: grid 3-4 columnas.
 * La seleccionada lleva anillo (patrón chip del design system).
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
  const enVivo = evento.estado === "EN_VIVO";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-60 shrink-0 snap-start rounded-row bg-surface p-3 text-left transition-colors lg:w-auto lg:shrink",
        seleccionado
          ? "ring-[1.5px] ring-foreground"
          : "active:bg-surface-raised lg:hover:bg-surface-raised",
      )}
    >
      <span className="mb-2 block truncate text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
        {evento.competicion.nombre}
        {evento.fase && ` · ${evento.fase}`}
      </span>

      {esEquipos ? (
        <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          {/* Equipos apilados con banderas circulares + goles */}
          <span className="flex min-w-0 flex-col gap-2">
            <FilaEquipo
              participante={local}
              goles={evento.marcador?.[0] ?? null}
            />
            <FilaEquipo
              participante={visitante}
              goles={evento.marcador?.[1] ?? null}
            />
          </span>
          {/* Columna fecha/hora con divisor (referente OneFootball) */}
          <ColumnaCuando evento={evento} enVivo={enVivo} />
        </span>
      ) : (
        <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <span className="line-clamp-2 text-[14px] font-bold leading-tight">
            {evento.nombre.replace("Gran Premio", "GP")}
          </span>
          <ColumnaCuando evento={evento} enVivo={enVivo} />
        </span>
      )}
    </button>
  );
}

/** Bandera/escudo circular + nombre + goles (si el partido los tiene). */
function FilaEquipo({
  participante,
  goles,
}: {
  participante?: ParticipanteEvento;
  goles: number | null;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-overlay ring-1 ring-border">
        {participante?.imagenUrl ? (
          <img
            src={participante.imagenUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <span className="text-[9px] font-bold text-foreground-secondary">
            {(participante?.nombre ?? "?").slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
        {participante?.nombre ?? "?"}
      </span>
      {goles !== null && (
        <span className="nums shrink-0 text-[13.5px] font-black">{goles}</span>
      )}
    </span>
  );
}

/** "Hoy 14:00" / "Mañana 11:00" / "9 jul 19:00" — o EN VIVO pulsante. */
function ColumnaCuando({
  evento,
  enVivo,
}: {
  evento: EventoCatalogo;
  enVivo: boolean;
}) {
  const fecha = new Date(evento.fechaInicio);
  return (
    <span className="flex min-w-16 flex-col items-center gap-0.5 self-stretch justify-center border-l border-border pl-3">
      {enVivo ? (
        <>
          <span className="size-1.5 animate-pulse rounded-full bg-live" />
          <span className="text-[10px] font-bold text-live">EN VIVO</span>
        </>
      ) : (
        <>
          <span className="text-[12px] font-semibold text-foreground-secondary">
            {etiquetaDia(fecha)}
          </span>
          <span className="nums text-[13px] font-bold">
            {fecha.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        </>
      )}
    </span>
  );
}

function etiquetaDia(fecha: Date): string {
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  const mismo = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (mismo(fecha, hoy)) return "Hoy";
  if (mismo(fecha, manana)) return "Mañana";
  return fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
