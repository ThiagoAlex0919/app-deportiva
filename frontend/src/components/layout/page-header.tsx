"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Header del Home: avatar + título + selector de contexto del feed
 * (Mi Ecosistema / Mundo Deportivo — 04_sitemap_y_ux.md §1.A).
 * El contenido de "Mundo Deportivo" llegará con el módulo sports del backend.
 */
export function HomeHeader() {
  const [vista, setVista] = useState<"ecosistema" | "mundo">("ecosistema");
  return (
    <header className="flex flex-col gap-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-ticket-muted text-sm font-bold text-ticket ring-2 ring-ticket">
            A
          </span>
          <h1 className="text-2xl font-bold">Inicio</h1>
        </div>
        <button
          aria-label="Buscar"
          className="flex size-10 items-center justify-center rounded-full bg-surface-raised text-foreground-secondary"
        >
          <Search size={20} />
        </button>
      </div>

      <div className="flex rounded-full bg-surface-raised p-1">
        {(
          [
            ["ecosistema", "Mi Ecosistema"],
            ["mundo", "Mundo Deportivo"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            onClick={() => setVista(valor)}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-semibold transition-colors",
              vista === valor
                ? "bg-foreground text-background"
                : "text-foreground-secondary",
            )}
          >
            {etiqueta}
          </button>
        ))}
      </div>
    </header>
  );
}

/** Header de páginas de sección (título simple). */
export function PageHeader({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <header className={cn("pt-4 pb-2", className)}>
      <h1 className="text-2xl font-bold">{title}</h1>
    </header>
  );
}
