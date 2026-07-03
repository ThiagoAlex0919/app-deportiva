import { Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pill compacta de costo/recompensa en Tickets.
 * Único badge autorizado a usar el acento `ticket` (06_design_system.md §2).
 */
export function TicketBadge({
  cantidad,
  signo,
  className,
}: {
  cantidad: number;
  /** "+" recompensa, "-" costo; omitir para cantidad neutra. */
  signo?: "+" | "-";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "nums inline-flex items-center gap-1 rounded-full bg-ticket-muted px-2.5 py-1 text-[13px] font-bold text-ticket",
        className,
      )}
    >
      <Ticket size={14} />
      {signo}
      {cantidad.toLocaleString("es-CO")}
    </span>
  );
}
