"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ticket } from "lucide-react";
import { NAV_ITEMS, esActiva } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Navegación lateral para DESKTOP (lg+). En mobile no existe: la navegación
 * es el BottomTabBar (04_sitemap_y_ux.md exige experiencia app nativa).
 */
export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-background px-4 py-6 lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-ticket-muted text-ticket">
          <Ticket size={20} strokeWidth={2.4} />
        </span>
        <span className="text-lg font-black tracking-tight">
          App Deportivo
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const activa = esActiva(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-row px-3 py-2.5 text-[15px] font-semibold transition-colors",
                activa
                  ? "bg-surface-raised text-foreground"
                  : "text-foreground-secondary hover:bg-surface hover:text-foreground",
              )}
            >
              <Icon size={20} strokeWidth={activa ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <p className="mt-auto px-3 text-[11px] leading-relaxed text-foreground-muted">
        Pronostica, gana Tickets y canjéalos por recompensas.
      </p>
    </aside>
  );
}
