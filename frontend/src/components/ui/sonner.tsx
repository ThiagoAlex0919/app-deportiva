"use client";

import { Toaster as Sonner } from "sonner";

/** Toasts sobre superficie overlay; errores del contrato del backend en danger. */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      theme="dark"
      toastOptions={{
        style: {
          background: "var(--color-surface-overlay)",
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
          borderRadius: "var(--radius-row)",
        },
      }}
    />
  );
}
