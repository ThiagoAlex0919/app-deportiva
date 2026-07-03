"use client";

import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getBalance, ApiRequestError } from "@/lib/api";
import { useSession } from "@/lib/store";

/**
 * Hero de la Billetera: saldo en tipografía display sobre gradiente ticket sutil.
 * Único lugar de la app con el acento a gran escala (06_design_system.md §4.3).
 * Consume GET /api/v1/ledger/balance (saldo SIEMPRE derivado del ledger).
 */
export function TicketBalance() {
  const { saldo, setSaldo } = useSession();
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [mensajeError, setMensajeError] = useState<string>("");

  useEffect(() => {
    let activo = true;
    getBalance() // identidad: sale del access token, no de un parámetro
      .then((r) => {
        if (!activo) return;
        setSaldo(r.saldo);
        setEstado("ok");
      })
      .catch((e: unknown) => {
        if (!activo) return;
        setMensajeError(
          e instanceof ApiRequestError ? e.error.mensaje : "Error inesperado",
        );
        setEstado("error");
      });
    return () => {
      activo = false;
    };
  }, [setSaldo]);

  return (
    <Card className="bg-gradient-to-br from-ticket-muted to-surface">
      <CardContent className="flex flex-col items-center gap-2 py-8">
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Saldo de Tickets
        </span>
        {estado === "loading" && <Skeleton className="h-10 w-36" />}
        {estado === "error" && (
          <p className="text-center text-sm text-foreground-secondary">
            {mensajeError}
          </p>
        )}
        {estado === "ok" && saldo !== null && (
          <div className="flex items-center gap-2.5 text-ticket">
            <Ticket size={30} strokeWidth={2.4} />
            <span className="nums text-4xl font-black tracking-tight">
              {saldo.toLocaleString("es-CO")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
