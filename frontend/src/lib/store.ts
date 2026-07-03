/**
 * Estado global de sesión (Zustand + persist).
 *
 * Estrategia de tokens (07_modulo_users_jwt.md):
 *  - accessToken: SOLO en memoria (no se persiste — minimiza exposición XSS).
 *  - refreshToken + usuario: en localStorage — al recargar la página, el
 *    cliente API usa el refresh para obtener un access nuevo automáticamente.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PerfilUsuario {
  id: string;
  email: string;
  nombre: string | null;
  createdAt: string;
}

interface SessionState {
  usuario: PerfilUsuario | null;
  /** JWT de 15 min — vive solo en memoria. */
  accessToken: string | null;
  /** Token opaco de 7 días — persiste para sobrevivir recargas. */
  refreshToken: string | null;
  /** Saldo cacheado; la fuente de verdad es GET /ledger/balance. */
  saldo: number | null;

  setSesion: (s: {
    usuario: PerfilUsuario;
    accessToken: string;
    refreshToken: string;
  }) => void;
  clearSesion: () => void;
  setSaldo: (saldo: number) => void;
  /** Resta optimista tras un pronóstico exitoso (el backend ya cobró). */
  debitar: (cantidad: number) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      usuario: null,
      accessToken: null,
      refreshToken: null,
      saldo: null,

      setSesion: ({ usuario, accessToken, refreshToken }) =>
        set({ usuario, accessToken, refreshToken }),
      clearSesion: () =>
        set({ usuario: null, accessToken: null, refreshToken: null, saldo: null }),
      setSaldo: (saldo) => set({ saldo }),
      debitar: (cantidad) =>
        set((s) => ({ saldo: s.saldo === null ? null : s.saldo - cantidad })),
    }),
    {
      name: "app-deportivo-sesion",
      // El accessToken NUNCA se persiste; el saldo tampoco (se rederiva).
      partialize: (s) => ({ usuario: s.usuario, refreshToken: s.refreshToken }),
    },
  ),
);
