import {
  Home,
  Gamepad2,
  Wallet,
  Store,
  User,
  type LucideIcon,
} from "lucide-react";

/** 5 módulos de 04_sitemap_y_ux.md §1 — compartidos por tab bar y sidebar. */
export const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/juego", label: "Juego", icon: Gamepad2 },
  { href: "/billetera", label: "Billetera", icon: Wallet },
  { href: "/tienda", label: "Tienda", icon: Store },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function esActiva(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
