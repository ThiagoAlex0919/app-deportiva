"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/shared/section-header";
import { StoryCard } from "@/components/cards/story-card";
import { EventCard } from "@/components/cards/event-card";
import { PredictionPanel } from "@/components/gamification/prediction-panel";
import { getEventos, ApiRequestError, type EventoCatalogo } from "@/lib/api";

/**
 * Contenido dinámico del Home (doc 08): eventos reales del catálogo.
 * Mobile: carrusel horizontal + tarjeta destacada debajo.
 * Desktop (lg+): lista lateral izquierda + destacada sticky a la derecha.
 */
export function HomeContent() {
  const [eventos, setEventos] = useState<EventoCatalogo[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    let activo = true;
    getEventos()
      .then((r) => {
        if (!activo) return;
        setEventos(r.eventos);
        setSeleccionadoId(r.eventos[0]?.id ?? null);
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

  if (estado === "loading") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-36 shrink-0" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
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

  if (eventos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-foreground-secondary">
          No hay eventos programados por ahora. Vuelve pronto.
        </CardContent>
      </Card>
    );
  }

  const seleccionado =
    eventos.find((e) => e.id === seleccionadoId) ?? eventos[0];

  return (
    <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* Carrusel (mobile) / lista compacta lateral (desktop) */}
      <div>
        <SectionHeader title="Próximos eventos" />
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {eventos.map((e) => (
            <StoryCard
              key={e.id}
              evento={e}
              seleccionado={e.id === seleccionado.id}
              onClick={() => setSeleccionadoId(e.id)}
            />
          ))}
        </div>
      </div>

      {/* Evento destacado + pronóstico */}
      <div className="lg:sticky lg:top-6">
        <SectionHeader
          title="Destacado"
          action={
            <Link
              href={`/evento/${seleccionado.id}`}
              className="text-[13px] font-semibold text-foreground-secondary transition-colors hover:text-foreground"
            >
              Detalle del partido →
            </Link>
          }
        />
        <EventCard evento={seleccionado}>
          <PredictionPanel evento={seleccionado} />
        </EventCard>
      </div>
    </div>
  );
}
