"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSesion } from "@/components/auth/require-session";
import { crearPrediccion, ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Widget de pronóstico MARCADOR_EXACTO (POST /gamification/predictions).
 * ECONOMÍA v2 (doc 09): pronosticar es GRATIS — el framing es de recompensa
 * ("si aciertas, ganas Tickets"), nunca de costo.
 * Payload del catálogo del dominio: { "marcador": [local, visitante] }.
 * Idempotente por usuario+evento+modalidad → `yaExistia` en la respuesta.
 */
export function PredictionWidget({
  eventoId,
  local,
  visitante,
  onConfirmado,
}: {
  eventoId: string;
  local: string;
  visitante: string;
  onConfirmado?: (payload: Record<string, unknown>) => void;
}) {
  const { listo, autenticado } = useSesion();
  const [marcador, setMarcador] = useState<[number, number]>([0, 0]);
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const ajustar = (lado: 0 | 1, delta: number) =>
    setMarcador((m) => {
      const copia: [number, number] = [...m];
      copia[lado] = Math.max(0, Math.min(20, copia[lado] + delta));
      return copia;
    });

  const confirmar = async () => {
    setEnviando(true);
    try {
      const payload = { marcador };
      const r = await crearPrediccion({
        eventoId,
        tipo: "MARCADOR_EXACTO",
        payload,
      });
      if (r.yaExistia) {
        toast.info("Ya tenías un pronóstico para este partido.");
      } else {
        toast.success("¡Pronóstico registrado! Si aciertas, ganas Tickets.");
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
          Marcador exacto
        </span>
        {/* Recompensa, nunca costo (economía v2) */}
        <span className="inline-flex items-center gap-1 rounded-full bg-ticket-muted px-2.5 py-1 text-[12px] font-bold text-ticket">
          <Ticket size={13} />
          Gana si aciertas
        </span>
      </div>

      <div className="mb-4 flex items-center justify-center gap-6">
        {([0, 1] as const).map((lado) => (
          <div key={lado} className="flex flex-col items-center gap-2">
            <span className="max-w-24 truncate text-[13px] text-foreground-secondary">
              {lado === 0 ? local : visitante}
            </span>
            <div className="flex items-center gap-2">
              <button
                aria-label="restar"
                onClick={() => ajustar(lado, -1)}
                disabled={confirmado}
                className="flex size-8 items-center justify-center rounded-full bg-surface-overlay text-foreground-secondary active:text-foreground disabled:opacity-40"
              >
                <Minus size={16} />
              </button>
              <span className="nums w-8 text-center text-3xl font-black">
                {marcador[lado]}
              </span>
              <button
                aria-label="sumar"
                onClick={() => ajustar(lado, 1)}
                disabled={confirmado}
                className="flex size-8 items-center justify-center rounded-full bg-surface-overlay text-foreground-secondary active:text-foreground disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {listo && !autenticado ? (
        <Button asChild variant="secondary" fullWidth>
          <Link href="/login">Inicia sesión para pronosticar</Link>
        </Button>
      ) : (
        <Button
          variant="cta"
          fullWidth
          disabled={!listo || enviando || confirmado}
          onClick={confirmar}
          className={cn(confirmado && "opacity-60")}
        >
          {confirmado
            ? "Pronóstico registrado ✓"
            : enviando
              ? "Confirmando…"
              : "Confirmar pronóstico"}
        </Button>
      )}
    </div>
  );
}
