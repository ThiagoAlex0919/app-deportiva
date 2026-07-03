"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Gamepad2,
  Wallet,
  Store,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** 5 módulos de 04_sitemap_y_ux.md §1. */
const TABS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/juego", label: "Juego", icon: Gamepad2 },
  { href: "/billetera", label: "Billetera", icon: Wallet },
  { href: "/tienda", label: "Tienda", icon: Store },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-16 max-w-[480px] items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
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
