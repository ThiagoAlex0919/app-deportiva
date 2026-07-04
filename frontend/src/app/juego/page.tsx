import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent } from "@/components/ui/card";

/**
 * B. Zona de Juego — 04_sitemap_y_ux.md §1.B
 * Placeholder Fase 1: misiones, pronósticos y pollas llegan con el motor
 * de reglas de gamificación (backend, fase posterior).
 */
export default function JuegoPage() {
  return (
    <div className="flex flex-col gap-2 lg:mx-auto lg:max-w-xl">
      <PageHeader title="Zona de Juego" />
      {["Misiones diarias", "Pronósticos", "Pollas comunitarias"].map(
        (seccion) => (
          <div key={seccion}>
            <SectionHeader title={seccion} />
            <Card>
              <CardContent className="py-8 text-center text-sm text-foreground-secondary">
                Muy pronto: gana Tickets participando.
              </CardContent>
            </Card>
          </div>
        ),
      )}
    </div>
  );
}
