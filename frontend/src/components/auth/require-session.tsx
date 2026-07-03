"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/store";

/**
 * Hook: espera la hidratación del store persistido (evita mismatch SSR)
 * y expone si hay sesión. `listo=false` durante el primer render.
 */
export function useSesion() {
  const [listo, setListo] = useState(false);
  const refreshToken = useSession((s) => s.refreshToken);
  const usuario = useSession((s) => s.usuario);
  useEffect(() => setListo(true), []);
  return { listo, autenticado: Boolean(refreshToken), usuario };
}

/** Envuelve contenido que requiere sesión; si no la hay, invita a entrar. */
export function RequireSession({
  children,
  mensaje = "Inicia sesión para ver esta sección.",
}: {
  children: React.ReactNode;
  mensaje?: string;
}) {
  const { listo, autenticado } = useSesion();

  if (!listo) return <Skeleton className="h-32 w-full" />;

  if (!autenticado) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <p className="text-center text-sm text-foreground-secondary">
            {mensaje}
          </p>
          <Button asChild variant="primary">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
