"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Trophy, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketBadge } from "@/components/economy/ticket-badge";
import { useSesion } from "@/components/auth/require-session";
import { PredictionWidget } from "./prediction-widget";
import { PodioWidget } from "./podio-widget";
import {
  getMisPredicciones,
  type EventoCatalogo,
  type MiPrediccion,
} from "@/lib/api";

/**
 * Panel de pronóstico del evento destacado (doc 08).
 * 1. Elige el widget según deporte.formato (Strategy de UI).
 * 2. Si el usuario ya pronosticó esta modalidad, muestra el resumen
 *    en lugar del formulario (consulta /predictions/mine al montar).
 */
export function PredictionPanel({ evento }: { evento: EventoCatalogo }) {
  const { listo, autenticado } = useSesion();
  const esEquipos = evento.deporte.formato === "EQUIPOS";
  const modalidad = esEquipos ? "MARCADOR_EXACTO" : "PODIO";

  const [cargando, setCargando] = useState(true);
  const [existente, setExistente] = useState<MiPrediccion | null>(null);

  useEffect(() => {
    let activo = true;
    setExistente(null);
    if (!listo) return;
    if (!autenticado) {
      setCargando(false);
      return;
    }
    setCargando(true);
    getMisPredicciones(evento.id)
      .then((r) => {
        if (!activo) return;
        setExistente(r.predicciones.find((p) => p.tipo === modalidad) ?? null);
      })
      .catch(() => undefined) // sin bloqueo: si falla, se muestra el widget
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [evento.id, modalidad, listo, autenticado]);

  if (!listo || cargando) return <Skeleton className="h-40 w-full" />;

  if (existente) {
    return (
      <ResumenPrediccion
        prediccion={existente}
        participantes={evento.participantes}
      />
    );
  }

  // Partidos en vivo o cerrados no aceptan pronósticos nuevos (regla del
  // dominio EVENTO_NO_APOSTABLE — aquí solo se comunica antes del 409).
  if (evento.estado !== "PROGRAMADO") {
    return (
      <div className="rounded-row bg-surface-raised p-4 text-center text-sm text-foreground-secondary">
        {evento.estado === "EN_VIVO"
          ? "El partido está en juego — los pronósticos se cerraron al inicio."
          : "Este evento ya no acepta pronósticos."}
      </div>
    );
  }

  return esEquipos ? (
    <PredictionWidget
      eventoId={evento.id}
      local={
        evento.participantes.find((p) => p.rol === "LOCAL")?.nombre ?? "Local"
      }
      visitante={
        evento.participantes.find((p) => p.rol === "VISITANTE")?.nombre ??
        "Visitante"
      }
    />
  ) : (
    <PodioWidget eventoId={evento.id} participantes={evento.participantes} />
  );
}

/**
 * "Ya pronosticaste": resumen del payload + estado del oráculo (doc 10).
 *  - PENDIENTE: neutro ("si aciertas, ganas Tickets")
 *  - ACERTADA: success + recompensa ganada
 *  - FALLADA/ANULADA: gris, sin drama (no se pierde nada — economía v2)
 */
function ResumenPrediccion({
  prediccion,
  participantes,
}: {
  prediccion: MiPrediccion;
  participantes: EventoCatalogo["participantes"];
}) {
  let detalle = "";
  if (prediccion.tipo === "MARCADOR_EXACTO") {
    const marcador = prediccion.payload.marcador as [number, number];
    detalle = `Marcador exacto: ${marcador?.[0]} - ${marcador?.[1]}`;
  } else if (prediccion.tipo === "PODIO") {
    const podio = (prediccion.payload.podio as string[]) ?? [];
    detalle = podio
      .map(
        (id, i) =>
          `${i + 1}º ${participantes.find((p) => p.id === id)?.nombre ?? "?"}`,
      )
      .join(" · ");
  }

  const acertada = prediccion.estado === "ACERTADA";
  const fallada =
    prediccion.estado === "FALLADA" || prediccion.estado === "ANULADA";

  return (
    <div className="flex items-center gap-3 rounded-row bg-surface-raised p-4">
      {acertada ? (
        <Trophy size={22} className="shrink-0 text-success" />
      ) : fallada ? (
        <XCircle size={22} className="shrink-0 text-foreground-muted" />
      ) : (
        <CheckCircle2 size={22} className="shrink-0 text-success" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {acertada
            ? "¡Acertaste!"
            : fallada
              ? prediccion.estado === "ANULADA"
                ? "Evento anulado"
                : "No acertaste esta vez"
              : "Ya pronosticaste"}
        </p>
        <p className="truncate text-[13px] text-foreground-secondary">
          {detalle}
          {!acertada && !fallada && " — si aciertas, ganas Tickets"}
        </p>
      </div>
      {acertada && prediccion.recompensaTickets && (
        <TicketBadge cantidad={prediccion.recompensaTickets} signo="+" />
      )}
    </div>
  );
}
