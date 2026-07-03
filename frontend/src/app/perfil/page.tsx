import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

/**
 * E. Perfil y Comunidad — 04_sitemap_y_ux.md §1.E
 * Placeholder Fase 1: preferencias y auth llegan con el módulo users (JWT).
 */
const OPCIONES = [
  "Mis deportes y equipos",
  "Estadísticas de acierto",
  "Rankings de la comunidad",
  "Configuración de cuenta",
];

export default function PerfilPage() {
  return (
    <div className="flex flex-col gap-2">
      <PageHeader title="Perfil" />
      <div className="flex items-center gap-4 py-2">
        <span className="flex size-16 items-center justify-center rounded-full bg-ticket-muted text-xl font-bold text-ticket ring-2 ring-ticket">
          A
        </span>
        <div>
          <p className="text-lg font-bold">Usuario Demo</p>
          <p className="text-sm text-foreground-secondary">
            Identidad temporal (módulo users pendiente)
          </p>
        </div>
      </div>
      <SectionHeader title="Cuenta" />
      <Card>
        <CardContent className="p-2">
          {OPCIONES.map((opcion) => (
            <button
              key={opcion}
              className="flex w-full items-center justify-between border-b border-border p-3 text-left text-[15px] font-medium last:border-b-0"
            >
              {opcion}
              <ChevronRight size={18} className="text-foreground-muted" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
