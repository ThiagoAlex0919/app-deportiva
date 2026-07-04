"use client";

/**
 * E. Perfil y Comunidad — 04_sitemap_y_ux.md §1.E
 * Muestra el usuario REAL de la sesión (07_modulo_users_jwt.md) con logout.
 * Preferencias, estadísticas y rankings llegan en fases posteriores.
 */
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequireSession, useSesion } from "@/components/auth/require-session";
import { cerrarSesion } from "@/lib/api";

const OPCIONES = [
  "Mis deportes y equipos",
  "Estadísticas de acierto",
  "Rankings de la comunidad",
  "Configuración de cuenta",
];

export default function PerfilPage() {
  return (
    <div className="flex flex-col gap-2 lg:mx-auto lg:max-w-xl">
      <PageHeader title="Perfil" />
      <RequireSession mensaje="Inicia sesión para ver tu perfil.">
        <ContenidoPerfil />
      </RequireSession>
    </div>
  );
}

function ContenidoPerfil() {
  const router = useRouter();
  const { usuario } = useSesion();
  const inicial = (usuario?.nombre ?? usuario?.email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <div className="flex items-center gap-4 py-2">
        <span className="flex size-16 items-center justify-center rounded-full bg-ticket-muted text-xl font-bold text-ticket ring-2 ring-ticket">
          {inicial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">
            {usuario?.nombre ?? "Sin nombre"}
          </p>
          <p className="truncate text-sm text-foreground-secondary">
            {usuario?.email}
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

      <div className="pt-4">
        <Button
          variant="secondary"
          fullWidth
          onClick={async () => {
            await cerrarSesion();
            router.push("/login");
          }}
        >
          <LogOut size={18} />
          Cerrar sesión
        </Button>
      </div>
    </>
  );
}
