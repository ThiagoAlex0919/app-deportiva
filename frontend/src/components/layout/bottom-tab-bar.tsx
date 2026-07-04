"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, esActiva } from "./nav-items";
import { cn } from "@/lib/utils";

/** Navegación inferior — SOLO mobile (en lg+ la sustituye el SideNav). */
export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex h-16 max-w-[480px] items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = esActiva(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active ? "text-foreground" : "text-foreground-muted",
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
