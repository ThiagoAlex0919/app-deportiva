"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/section-header";
import { PredictionPanel } from "@/components/gamification/prediction-panel";
import {
  getEventoDetalle,
  ApiRequestError,
  type DetallePartido,
  type MomentoPartido,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/** Detalle en vivo del partido (doc 13). */
export function EventoDetalle({ id }: { id: string }) {
  const router = useRouter();
  const [detalle, setDetalle] = useState<DetallePartido | null>(null);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [actualizando, setActualizando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const d = await getEventoDetalle(id);
      setDetalle(d);
      setEstado("ok");
    } catch (e) {
      setMensajeError(
        e instanceof ApiRequestError ? e.error.mensaje : "Error inesperado",
      );
      setEstado("error");
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="flex flex-col gap-4 lg:mx-auto lg:max-w-2xl">
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-surface-raised text-foreground-secondary"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        {detalle?.evento.estado === "EN_VIVO" && (
          <Button
            variant="secondary"
            size="sm"
            disabled={actualizando}
            onClick={async () => {
              setActualizando(true);
              await cargar();
              setActualizando(false);
            }}
          >
            <RefreshCw size={15} className={cn(actualizando && "animate-spin")} />
            Actualizar
          </Button>
        )}
      </div>

      {estado === "loading" && (
        <>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </>
      )}

      {estado === "error" && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-foreground-secondary">
            {mensajeError}
          </CardContent>
        </Card>
      )}

      {estado === "ok" && detalle && <Contenido detalle={detalle} />}
    </div>
  );
}

/* ------------------------------ Secciones ------------------------------- */

function Contenido({ detalle }: { detalle: DetallePartido }) {
  const { evento, marcador, minuto, cronologia, ficha, caminoTorneo } = detalle;
  const local = evento.participantes.find((p) => p.rol === "LOCAL");
  const visitante = evento.participantes.find((p) => p.rol === "VISITANTE");
  const enVivo = evento.estado === "EN_VIVO";
  const finalizado = evento.estado === "FINALIZADO";
  const fecha = new Date(evento.fechaInicio);

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* HERO: marcador */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <p className="text-[13px] text-foreground-secondary">
            <span className="font-semibold text-foreground">
              {evento.competicion.nombre}
            </span>
            {evento.fase && ` · ${evento.fase}`}
          </p>

          <div className="flex w-full items-center justify-between">
            <Equipo nombre={local?.nombre} imagenUrl={local?.imagenUrl} />
            <div className="flex flex-col items-center gap-1.5">
              {marcador.actual ? (
                <span className="nums text-5xl font-black tracking-tight">
                  {marcador.actual[0]} - {marcador.actual[1]}
                </span>
              ) : (
                <span className="nums text-4xl font-black tracking-tight">
                  {fecha.toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </span>
              )}
              {enVivo && (
                <span className="flex items-center gap-1.5 rounded-full bg-live/10 px-3 py-1 text-[13px] font-bold text-live">
                  <span className="size-1.5 animate-pulse rounded-full bg-live" />
                  {minuto ? `${minuto}'` : "EN VIVO"}
                </span>
              )}
              {finalizado && (
                <span className="text-[13px] font-semibold text-foreground-secondary">
                  Final
                  {marcador.medioTiempo &&
                    ` · HT ${marcador.medioTiempo[0]}-${marcador.medioTiempo[1]}`}
                </span>
              )}
              {!enVivo && !finalizado && (
                <span className="text-[13px] text-foreground-secondary">
                  {fecha.toLocaleDateString("es-CO", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </div>
            <Equipo nombre={visitante?.nombre} imagenUrl={visitante?.imagenUrl} />
          </div>
        </CardContent>
      </Card>

      {/* PRONÓSTICO */}
      <PredictionPanel evento={evento} />

      {/* CRONOLOGÍA */}
      {cronologia.length > 0 && (
        <section>
          <SectionHeader title="Cronología" />
          <Card>
            <CardContent className="flex flex-col p-2">
              {cronologia.map((momento, i) => (
                <Momento
                  key={i}
                  momento={momento}
                  esLocal={momento.participanteId === local?.id}
                />
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* CAMINO EN EL TORNEO */}
      {caminoTorneo.length > 0 && (
        <section>
          <SectionHeader title="Camino en el torneo" />
          <Card>
            <CardContent className="p-2">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-foreground-muted">
                    <th className="p-2 font-semibold">Equipo</th>
                    <th className="p-2 text-center font-semibold">Pos</th>
                    <th className="p-2 text-center font-semibold">PJ</th>
                    <th className="p-2 text-center font-semibold">G-E-P</th>
                    <th className="p-2 text-center font-semibold">GF:GC</th>
                    <th className="p-2 text-center font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {caminoTorneo.map((fila) => {
                    const equipo = evento.participantes.find(
                      (p) => p.id === fila.participanteId,
                    );
                    return (
                      <tr key={fila.participanteId} className="border-t border-border">
                        <td className="flex items-center gap-2 p-2 font-semibold">
                          {equipo?.imagenUrl && (
                            <img
                              src={equipo.imagenUrl}
                              alt=""
                              className="size-5 object-contain"
                            />
                          )}
                          {equipo?.nombre}
                          {fila.grupo && (
                            <span className="text-[11px] font-normal text-foreground-muted">
                              {fila.grupo}
                            </span>
                          )}
                        </td>
                        <td className="nums p-2 text-center">{fila.posicion}º</td>
                        <td className="nums p-2 text-center">{fila.pj}</td>
                        <td className="nums p-2 text-center">
                          {fila.g}-{fila.e}-{fila.p}
                        </td>
                        <td className="nums p-2 text-center">
                          {fila.gf}:{fila.gc}
                        </td>
                        <td className="nums p-2 text-center font-bold">
                          {fila.puntos}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* FICHA */}
      {(ficha.estadio || ficha.arbitro) && (
        <section>
          <SectionHeader title="Ficha" />
          <Card>
            <CardContent className="flex flex-col gap-2 text-[14px]">
              {ficha.estadio && (
                <p>
                  <span className="text-foreground-secondary">Estadio: </span>
                  {ficha.estadio}
                </p>
              )}
              {ficha.arbitro && (
                <p>
                  <span className="text-foreground-secondary">Árbitro: </span>
                  {ficha.arbitro}
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function Equipo({
  nombre,
  imagenUrl,
}: {
  nombre?: string;
  imagenUrl?: string | null;
}) {
  return (
    <div className="flex w-24 flex-col items-center gap-2">
      {imagenUrl ? (
        <img src={imagenUrl} alt="" className="size-14 object-contain drop-shadow" />
      ) : (
        <span className="flex size-14 items-center justify-center rounded-full bg-surface-overlay text-lg font-bold ring-1 ring-border">
          {(nombre ?? "?").slice(0, 3).toUpperCase()}
        </span>
      )}
      <span className="line-clamp-2 text-center text-[13px] font-medium">
        {nombre ?? "?"}
      </span>
    </div>
  );
}

/** Fila de la cronología: goles a color, tarjetas y cambios discretos. */
function Momento({
  momento,
  esLocal,
}: {
  momento: MomentoPartido;
  esLocal: boolean;
}) {
  const icono =
    momento.tipo === "GOL"
      ? "⚽"
      : momento.tipo === "TARJETA_AMARILLA"
        ? "🟨"
        : momento.tipo === "TARJETA_ROJA"
          ? "🟥"
          : "🔁";
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-border p-2.5 last:border-b-0",
        !esLocal && "flex-row-reverse text-right",
      )}
    >
      <span className="nums w-9 shrink-0 text-center text-[13px] font-bold text-foreground-secondary">
        {momento.minuto !== null ? `${momento.minuto}'` : "—"}
      </span>
      <span className="text-lg leading-none">{icono}</span>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-[14px]",
            momento.tipo === "GOL" ? "font-bold" : "font-medium",
          )}
        >
          {momento.jugador ?? "—"}
        </p>
        {momento.detalle && (
          <p className="truncate text-[12px] text-foreground-muted">
            {momento.detalle}
          </p>
        )}
      </div>
    </div>
  );
}
