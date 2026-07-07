"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toggle light/dark (pedido 2026-07-06, referente EFECTO29).
 * Dark es el default del design system (doc 04); la preferencia persiste
 * en localStorage y un script inline en el layout la aplica antes del
 * primer paint (sin flash).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [claro, setClaro] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setClaro(document.documentElement.classList.contains("light"));
    setMontado(true);
  }, []);

  const alternar = () => {
    const html = document.documentElement;
    const nuevo = !html.classList.contains("light");
    html.classList.toggle("light", nuevo);
    try {
      localStorage.setItem("tema", nuevo ? "light" : "dark");
    } catch {
      /* almacenamiento bloqueado: el toggle sigue funcionando en sesión */
    }
    setClaro(nuevo);
  };

  return (
    <button
      onClick={alternar}
      aria-label={claro ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      className={cn(
        "flex size-10 items-center justify-center rounded-full bg-surface-raised text-foreground-secondary transition-colors hover:text-foreground",
        className,
      )}
    >
      {/* Antes de montar no sabemos el tema: icono neutro estable (SSR). */}
      {!montado || !claro ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
