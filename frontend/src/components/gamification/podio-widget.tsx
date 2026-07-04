"use client";

import { useState } from "react";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSesion } from "@/components/auth/require-session";
import {
  crearPrediccion,
  ApiRequestError,
  type ParticipanteEvento,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Widget PODIO para formatos MULTITUDINARIOS (F1, ciclismo... — doc 08).
 * ECONOMÍA v2 (doc 09): gratis; framing de recompensa.
 * El usuario toca participantes en orden: 1º, 2º, 3º (tocar de nuevo lo quita).
 * Payload del catálogo del dominio: { "podio": [id1, id2, id3] }.
 */
export function PodioWidget({
  eventoId,
  participantes,
  onConfirmado,
}: {
  eventoId: string;
  participantes: ParticipanteEvento[];
  onConfirmado?: (payload: Record<string, unknown>) => void;
}) {
  const { listo, autenticado } = useSesion();
  const [podio, setPodio] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const alternar = (id: string) =>
    setPodio((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p,
    );

  const confirmar = async () => {
    setEnviando(true);
    try {
      const payload = { podio };
      const r = await crearPrediccion({ eventoId, tipo: "PODIO", payload });
      if (r.yaExistia) {
        toast.info("Ya tenías un podio para esta carrera.");
      } else {
        toast.success("¡Podio registrado! Si aciertas, ganas Tickets.");
      }
      setConfirmado(true);
      onConfirmado?.(payload);
    } catch (e) {
      toast.error(
        e instanceof ApiRequestError ? e.error.mensaje : "Error inesperado",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rounded-row bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-bold uppercase tracking-wide">
          Pronostica el podio
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-ticket-muted px-2.5 py-1 text-[12px] font-bold text-ticket">
          <Ticket size={13} />
          Gana si aciertas
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        {participantes.map((p) => {
          const posicion = podio.indexOf(p.id);
          return (
            <button
              key={p.id}
              disabled={confirmado}
              onClick={() => alternar(p.id)}
              className={cn(
                "flex items-center gap-3 rounded-row px-3 py-2.5 text-left text-[15px] font-medium transition-colors disabled:opacity-60",
                posicion >= 0
                  ? "bg-surface-overlay ring-[1.5px] ring-foreground"
                  : "bg-surface-overlay/50 active:bg-surface-overlay",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-black",
                  posicion >= 0
                    ? "bg-foreground text-background"
                    : "bg-surface text-foreground-muted",
                )}
              >
                {posicion >= 0 ? `${posicion + 1}º` : "·"}
              </span>
              {p.nombre}
            </button>
          );
        })}
      </div>

      {listo && !autenticado ? (
        <Button asChild variant="secondary" fullWidth>
          <Link href="/login">Inicia sesión para pronosticar</Link>
        </Button>
      ) : (
        <Button
          variant="cta"
          fullWidth
          disabled={!listo || podio.length !== 3 || enviando || confirmado}
          onClick={confirmar}
        >
          {confirmado
            ? "Podio registrado ✓"
            : enviando
              ? "Confirmando…"
              : podio.length !== 3
                ? `Elige ${3 - podio.length} más`
                : "Confirmar podio"}
        </Button>
      )}
    </div>
  );
}
