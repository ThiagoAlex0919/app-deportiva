import { PageHeader } from "@/components/layout/page-header";
import { TiendaContent } from "@/components/tienda/tienda-content";

/**
 * D. Tienda y Escenarios — 04_sitemap_y_ux.md §1.D, implementada según doc 15:
 * catálogo público, compra con descuento por Tickets (requiere sesión) y
 * mis pedidos. Reservas de escenarios deportivos: fase posterior.
 */
export default function TiendaPage() {
  return (
    <div className="flex flex-col gap-2">
      <PageHeader title="Tienda" />
      <TiendaContent />
    </div>
  );
}
