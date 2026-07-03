import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { TicketBalance } from "@/components/economy/ticket-balance";
import { WalletHistory } from "@/components/economy/wallet-history";

/**
 * C. Billetera y Recompensas — 04_sitemap_y_ux.md §1.C
 * Conectada a las APIs del Ledger (GET /balance, GET /history).
 * El catálogo de redención llegará con el módulo Marketplace.
 */
export default function BilleteraPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Billetera" />
      <TicketBalance />
      <div>
        <SectionHeader title="Movimientos" />
        <WalletHistory />
      </div>
    </div>
  );
}
