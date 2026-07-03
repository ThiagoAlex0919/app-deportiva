import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { TicketBalance } from "@/components/economy/ticket-balance";
import { WalletHistory } from "@/components/economy/wallet-history";
import { RequireSession } from "@/components/auth/require-session";

/**
 * C. Billetera y Recompensas — 04_sitemap_y_ux.md §1.C
 * Requiere sesión (la identidad sale del access token).
 * El catálogo de redención llegará con el módulo Marketplace.
 */
export default function BilleteraPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Billetera" />
      <RequireSession mensaje="Inicia sesión para ver tu saldo y movimientos.">
        <TicketBalance />
        <div>
          <SectionHeader title="Movimientos" />
          <WalletHistory />
        </div>
      </RequireSession>
    </div>
  );
}
