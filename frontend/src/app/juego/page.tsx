import { PageHeader } from "@/components/layout/page-header";
import { RequireSession } from "@/components/auth/require-session";
import { JuegoContent } from "@/components/juego/juego-content";

/**
 * B. Zona de Juego — 04_sitemap_y_ux.md §1.B, implementada según doc 14:
 * marcador personal, pronósticos por estado, faltantes y teasers.
 * Las Pollas (torneos con premio físico) son la siguiente iteración.
 */
export default function JuegoPage() {
  return (
    <div className="flex flex-col gap-2">
      <PageHeader title="Zona de Juego" />
      <RequireSession mensaje="Inicia sesión para ver tus pronósticos y tu racha.">
        <JuegoContent />
      </RequireSession>
    </div>
  );
}
