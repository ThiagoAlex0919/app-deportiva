"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/shared/section-header";
import { StoryCard } from "@/components/cards/story-card";
import { EventCard } from "@/components/cards/event-card";
import { PredictionPanel } from "@/components/gamification/prediction-panel";
import {
  getEventos,
  getEventoDetalle,
  ApiRequestError,
  type EventoCatalogo,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Pestana = "HOY" | "MANANA" | "PROXIMOS";

/**
 * Tablero de partidos del Home (rediseño compacto):
 *  1. Destacado/En directo ARRIBA a lo ancho (versus izq + pronóstico der en lg).
 *  2. Tabs Hoy / Mañana / Próximos con tarjetas compactas en grid —
 *     administra la información sin listas kilométricas (patrón OneFootball).
 */
export function HomeContent() {
  const [eventos, setEventos] = useState<EventoCatalogo[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana | null>(null);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [mensajeError, setMensajeError] = useState("");
  const [minutoVivo, setMinutoVivo] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getEventos(undefined, 40)
      .then((r) => {
        if (!activo) return;
        setEventos(r.eventos);
        // El directo manda; si no hay, el más próximo.
        const vivo = r.eventos.find((e) => e.estado === "EN_VIVO");
        setSeleccionadoId((vivo ?? r.eventos[0])?.id ?? null);
        setEstado("ok");
      })
      .catch((e) => {
        if (!activo) return;
        setMensajeError(
          e instanceof ApiRequestError ? e.error.mensaje : "Error inesperado",
        );
        setEstado("error");
      });
    return () => {
      activo = false;
    };
  }, []);

  const seleccionado =
    eventos.find((e) => e.id === seleccionadoId) ?? eventos[0];

  // Minuto de juego del destacado cuando está EN VIVO (caché 60s backend).
  useEffect(() => {
    let activo = true;
    setMinutoVivo(null);
    if (!seleccionado || seleccionado.estado !== "EN_VIVO") return;
    getEventoDetalle(seleccionado.id)
      .then((d) => activo && setMinutoVivo(d.minuto))
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [seleccionado?.id, seleccionado?.estado, seleccionado]);

  // Agrupación temporal para las tabs.
  const grupos = useMemo(() => agrupar(eventos), [eventos]);
  const pestanaActiva: Pestana =
    pestana ??
    (grupos.HOY.length > 0
      ? "HOY"
      : grupos.MANANA.length > 0
        ? "MANANA"
        : "PROXIMOS");

  if (estado === "loading") {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56 w-full" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-44 shrink-0 lg:w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (estado === "error") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-foreground-secondary">
          {mensajeError}
        </CardContent>
      </Card>
    );
  }

  if (eventos.length === 0 || !seleccionado) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-foreground-secondary">
          No hay eventos programados por ahora. Vuelve pronto.
        </CardContent>
      </Card>
    );
  }

  const TABS: Array<{ id: Pestana; etiqueta: string; cantidad: number }> = [
    { id: "HOY", etiqueta: "Hoy", cantidad: grupos.HOY.length },
    { id: "MANANA", etiqueta: "Mañana", cantidad: grupos.MANANA.length },
    { id: "PROXIMOS", etiqueta: "Próximos", cantidad: grupos.PROXIMOS.length },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* 1. EN DIRECTO / DESTACADO — arriba, a lo ancho */}
      <section>
        <SectionHeader
          title={seleccionado.estado === "EN_VIVO" ? "En directo" : "Destacado"}
          action={
            <Link
              href={`/evento/${seleccionado.id}`}
              className="text-[13px] font-semibold text-foreground-secondary transition-colors hover:text-foreground"
            >
              Detalle del partido →
            </Link>
          }
        />
        <EventCard evento={seleccionado} minuto={minutoVivo} horizontal>
          <PredictionPanel evento={seleccionado} />
        </EventCard>
      </section>

      {/* 2. TABLERO con tabs — compacto y a lo ancho */}
      <section>
        <SectionHeader title="Partidos" />
        <div className="mb-3 flex gap-2">
          {TABS.filter((t) => t.cantidad > 0).map((t) => (
            <button
              key={t.id}
              onClick={() => setPestana(t.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
                pestanaActiva === t.id
                  ? "bg-transparent text-foreground ring-[1.5px] ring-foreground"
                  : "bg-surface-raised text-foreground-secondary",
              )}
            >
              {t.etiqueta}
              <span className="ml-1.5 text-[11px] text-foreground-muted">
                {t.cantidad}
              </span>
            </button>
          ))}
        </div>

        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-4">
          {grupos[pestanaActiva].map((e) => (
            <StoryCard
              key={e.id}
              evento={e}
              seleccionado={e.id === seleccionado.id}
              onClick={() => setSeleccionadoId(e.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Hoy / Mañana / Próximos según fecha local del usuario. */
function agrupar(eventos: EventoCatalogo[]): Record<Pestana, EventoCatalogo[]> {
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  const mismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const grupos: Record<Pestana, EventoCatalogo[]> = {
    HOY: [],
    MANANA: [],
    PROXIMOS: [],
  };
  for (const e of eventos) {
    const fecha = new Date(e.fechaInicio);
    if (mismoDia(fecha, hoy)) grupos.HOY.push(e);
    else if (mismoDia(fecha, manana)) grupos.MANANA.push(e);
    else grupos.PROXIMOS.push(e);
  }
  return grupos;
}
