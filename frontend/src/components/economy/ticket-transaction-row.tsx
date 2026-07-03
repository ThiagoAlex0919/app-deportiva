import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Movimiento } from "@/lib/api";

const NOMBRES_MODULO: Record<string, string> = {
  PRONOSTICOS: "Pronóstico",
  GAMIFICACION: "Gamificación",
  MARKETPLACE: "Tienda",
  RESERVAS: "Reservas",
  TESORERIA: "Bono",
};

/**
 * Fila del historial de billetera (GET /ledger/history).
 * Crédito: monto en success con "+". Débito: monto blanco con "−".
 */
export function TicketTransactionRow({ mov }: { mov: Movimiento }) {
  const credito = mov.direccion === "CREDITO";
  const fecha = new Date(mov.fecha).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          credito ? "bg-success/10 text-success" : "bg-surface-raised text-foreground-secondary",
        )}
      >
        {credito ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">
          {mov.descripcion ?? NOMBRES_MODULO[mov.modulo] ?? mov.modulo}
        </p>
        <p className="text-[13px] text-foreground-secondary">
          {NOMBRES_MODULO[mov.modulo] ?? mov.modulo} · {fecha}
        </p>
      </div>
      <span
        className={cn(
          "nums text-[15px] font-bold",
          credito ? "text-success" : "text-foreground",
        )}
      >
        {credito ? "+" : "−"}
        {mov.cantidad.toLocaleString("es-CO")}
      </span>
    </div>
  );
}
