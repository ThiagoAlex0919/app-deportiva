"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/shared/section-header";
import { StoryCard } from "@/components/cards/story-card";
import {
  getEventos,
  getMisPredicciones,
  ApiRequestError,
  type EventoCatalogo,
  type MiPrediccion,
  type ResumenPredicciones,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Pestana = "EN_JUEGO" | "RESUELTOS";

/**
 * Zona de Juego (doc 14): marcador personal, tus pronósticos por estado,
 * qué te falta por pronosticar y teasers de lo que viene (Misiones/Pollas).
 */
export function JuegoContent() {
  const [datos, setDatos] = useState<{
    resumen: ResumenPredicciones;
    predicciones: MiPrediccion[];
  } | null>(null);
  const [eventos, setEventos] = useState<EventoCatalogo[]>([]);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [mensajeError, setMensajeError] = useState("");
  const [pestana, setPestana] = useState<Pestana>("EN_JUEGO");

  useEffect(() => {
    let activo = true;
    Promise.all([getMisPredicciones(), getEventos(undefined, 40)])
      .then(([mias, catalogo]) => {
        if (!activo) return;
        setDatos(mias);
        setEventos(catalogo.eventos);
        // Si no hay pendientes pero sí resueltos, abrir en Resueltos.
        if (mias.resumen.pendientes === 0 && mias.resumen.total > 0) {
          setPestana("RESUELTOS");
        }
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

  const faltantes = useMemo(() => {
    if (!datos) return [];
    const pronosticados = new Set(datos.predicciones.map((p) => p.eventoId));
    return eventos.filter(
      (e) => e.estado === "PROGRAMADO" && !pronosticados.has(e.id),
    );
  }, [datos, eventos]);

  if (estado === "loading") {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
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

  if (!datos) return null;
  const { resumen, predicciones } = datos;
  const enJuego = predicciones.filter((p) => p.estado === "PENDIENTE");
  const resueltos = predicciones.filter((p) => p.estado !== "PENDIENTE");
  const lista = pestana === "EN_JUEGO" ? enJuego : resueltos;

  return (
    <div className="flex flex-col gap-2">
      {/* 1. MARCADOR PERSONAL */}
      <section>
        <SectionHeader title="Tu marcador" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard etiqueta="Aciertos" valor={String(resumen.acertadas)} />
          <StatCard etiqueta="Precisión" valor={`${resumen.precision}%`} />
          <StatCard
            etiqueta="Tickets ganados"
            valor={resumen.ticketsGanados.toLocaleString("es-CO")}
            acento
          />
          <StatCard etiqueta="En juego" valor={String(resumen.pendientes)} />
        </div>
      </section>

      {/* 2. MIS PRONÓSTICOS */}
      <section>
        <SectionHeader title="Mis pronósticos" />
        {predicciones.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-foreground-secondary">
              Aún no has pronosticado. Elige un partido abajo y lanza tu
              primer pronóstico — es gratis, y si aciertas ganas Tickets.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              {(
                [
                  ["EN_JUEGO", `En juego`, enJuego.length],
                  ["RESUELTOS", `Resueltos`, resueltos.length],
                ] as const
              ).map(([id, etiqueta, cantidad]) => (
                <button
                  key={id}
                  onClick={() => setPestana(id)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
                    pestana === id
                      ? "bg-transparent text-foreground ring-[1.5px] ring-foreground"
                      : "bg-surface-raised text-foreground-secondary",
                  )}
                >
                  {etiqueta}
                  <span className="ml-1.5 text-[11px] text-foreground-muted">
                    {cantidad}
                  </span>
                </button>
              ))}
            </div>
            {lista.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-foreground-secondary">
                  {pestana === "EN_JUEGO"
                    ? "Nada en juego ahora mismo."
                    : "Todavía no hay pronósticos resueltos."}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2 lg:grid-cols-2">
                {lista.map((p) => (
                  <PrediccionCard key={p.prediccionId} prediccion={p} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* 3. TE FALTAN POR PRONOSTICAR */}
      {faltantes.length > 0 && (
        <section>
          <SectionHeader title="Te faltan por pronosticar" />
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-4">
            {faltantes.slice(0, 8).map((e) => (
              <EventoLink key={e.id} evento={e} />
            ))}
          </div>
        </section>
      )}

      {/* 4. PRÓXIMAMENTE */}
      <section>
        <SectionHeader title="Próximamente" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ticket-muted text-ticket">
                <Trophy size={22} />
              </span>
              <div>
                <p className="font-bold">Pollas: torneos con premios reales</p>
                <p className="text-[13px] text-foreground-secondary">
                  Inscríbete con Tickets y compite por camisetas e indumentaria
                  original.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-overlay text-foreground-secondary">
                <Ticket size={22} />
              </span>
              <div>
                <p className="font-bold">Misiones diarias</p>
                <p className="text-[13px] text-foreground-secondary">
                  Gana Tickets extra por participar cada día.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ Piezas ---------------------------------- */

function StatCard({
  etiqueta,
  valor,
  acento = false,
}: {
  etiqueta: string;
  valor: string;
  acento?: boolean;
}) {
  return (
    <Card className={cn(acento && "bg-gradient-to-br from-ticket-muted to-surface")}>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground-secondary">
          {etiqueta}
        </span>
        <span
          className={cn(
            "nums text-3xl font-black tracking-tight",
            acento && "text-ticket",
          )}
        >
          {valor}
        </span>
      </CardContent>
    </Card>
  );
}

/** Tarjeta de un pronóstico: evento + tu pick + estado (doc 14). */
function PrediccionCard({ prediccion }: { prediccion: MiPrediccion }) {
  const { evento } = prediccion;
  const local = evento.participantes.find((p) => p.rol === "LOCAL");
  const visitante = evento.participantes.find((p) => p.rol === "VISITANTE");

  return (
    <Link
      href={`/evento/${evento.id}`}
      className="flex items-center gap-3 rounded-row bg-surface p-3 transition-colors active:bg-surface-raised lg:hover:bg-surface-raised"
    >
      {/* Banderas apiladas */}
      <span className="flex shrink-0 -space-x-2">
        {[local, visitante].filter(Boolean).map((p) => (
          <span
            key={p!.id}
            className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-surface-overlay ring-2 ring-surface"
          >
            {p!.imagenUrl ? (
              <img src={p!.imagenUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold">
                {p!.nombre.slice(0, 2).toUpperCase()}
              </span>
            )}
          </span>
        ))}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
          {evento.competicion}
        </span>
        <span className="block truncate text-[14px] font-bold">
          {evento.nombre}
        </span>
        <span className="block truncate text-[12px] text-foreground-secondary">
          Tu pick: {pickLegible(prediccion)}
        </span>
      </span>

      <ChipEstado prediccion={prediccion} />
    </Link>
  );
}

function ChipEstado({ prediccion }: { prediccion: MiPrediccion }) {
  const base =
    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide";
  switch (prediccion.estado) {
    case "ACERTADA":
      return (
        <span className={cn(base, "bg-success/10 text-success")}>
          +{prediccion.recompensaTickets ?? 0} 🎟
        </span>
      );
    case "FALLADA":
      return (
        <span className={cn(base, "bg-surface-overlay text-foreground-muted")}>
          Fallada
        </span>
      );
    case "ANULADA":
      return (
        <span className={cn(base, "bg-surface-overlay text-foreground-muted")}>
          Anulada
        </span>
      );
    default:
      return (
        <span className={cn(base, "bg-surface-overlay text-foreground-secondary")}>
          En juego
        </span>
      );
  }
}

/** Traduce el payload a texto humano según la modalidad. */
function pickLegible(p: MiPrediccion): string {
  if (p.tipo === "MARCADOR_EXACTO") {
    const m = p.payload.marcador as [number, number] | undefined;
    return m ? `${m[0]} - ${m[1]}` : "—";
  }
  if (p.tipo === "PODIO") {
    const podio = (p.payload.podio as string[]) ?? [];
    return podio
      .map(
        (id, i) =>
          `${i + 1}º ${
            p.evento.participantes.find((x) => x.id === id)?.nombre ?? "?"
          }`,
      )
      .join(" · ");
  }
  return p.tipo;
}

/** StoryCard reutilizada como acceso al detalle (ahí vive el widget).
 *  onClick + router en vez de <Link> para no anidar botón dentro de anchor. */
function EventoLink({ evento }: { evento: EventoCatalogo }) {
  const router = useRouter();
  return (
    <StoryCard
      evento={evento}
      seleccionado={false}
      onClick={() => router.push(`/evento/${evento.id}`)}
    />
  );
}
