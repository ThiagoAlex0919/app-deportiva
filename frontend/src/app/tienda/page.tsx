import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent } from "@/components/ui/card";

/**
 * D. Tienda y Escenarios — 04_sitemap_y_ux.md §1.D
 * Placeholder Fase 1: e-commerce y reservas llegan con el módulo Marketplace.
 */
export default function TiendaPage() {
  return (
    <div className="flex flex-col gap-2 lg:mx-auto lg:max-w-xl">
      <PageHeader title="Tienda" />
      {["Artículos deportivos", "Canchas y escenarios"].map((seccion) => (
        <div key={seccion}>
          <SectionHeader title={seccion} />
          <Card>
            <CardContent className="py-8 text-center text-sm text-foreground-secondary">
              Muy pronto: canjea tus Tickets por beneficios.
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
