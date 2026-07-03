"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TicketTransactionRow } from "./ticket-transaction-row";
import { getHistory, ApiRequestError, type Movimiento } from "@/lib/api";

/**
 * Historial transaccional con paginación por cursor (GET /ledger/history).
 * Estados obligatorios: loading (skeletons), error (mensaje del contrato), empty.
 */
export function WalletHistory() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [cargandoMas, setCargandoMas] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const primeraCarga = useRef(true);

  const cargar = useCallback(
    async (siguienteCursor?: string) => {
      try {
        const r = await getHistory(siguienteCursor);
        setMovimientos((prev) =>
          siguienteCursor ? [...prev, ...r.movimientos] : r.movimientos,
        );
        setCursor(r.nextCursor);
        setEstado("ok");
      } catch (e) {
        setMensajeError(
          e instanceof ApiRequestError ? e.error.mensaje : "Error inesperado",
        );
        setEstado("error");
      }
    },
    [],
  );

  useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false;
      void cargar();
    }
  }, [cargar]);

  if (estado === "loading") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (estado === "error") {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-foreground-secondary">
          {mensajeError}
        </CardContent>
      </Card>
    );
  }

  if (movimientos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-foreground-secondary">
          Aún no tienes movimientos. Participa en la Zona de Juego para ganar
          Tickets.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-1 pb-2">
        {movimientos.map((m) => (
          <TicketTransactionRow key={m.asientoId} mov={m} />
        ))}
        {cursor && (
          <div className="py-3">
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              disabled={cargandoMas}
              onClick={async () => {
                setCargandoMas(true);
                await cargar(cursor);
                setCargandoMas(false);
              }}
            >
              {cargandoMas ? "Cargando…" : "Ver más"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
