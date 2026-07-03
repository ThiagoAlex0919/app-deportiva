/**
 * Estado global (Zustand).
 *
 * TEMPORAL: la identidad es el usuario demo del seed del backend hasta que
 * exista el módulo users (JWT). Ver deuda técnica en 05_estado_del_proyecto.md.
 */
import { create } from "zustand";

/** Usuario "demo" sembrado por backend/prisma/seed.ts */
export const USUARIO_DEMO_ID = "00000000-0000-4000-8000-000000000001";

interface SessionState {
  usuarioId: string;
  /** Saldo cacheado en cliente; la fuente de verdad es GET /ledger/balance. */
  saldo: number | null;
  setSaldo: (saldo: number) => void;
  /** Resta optimista tras un pronóstico exitoso (el backend ya cobró). */
  debitar: (cantidad: number) => void;
}

export const useSession = create<SessionState>((set) => ({
  usuarioId: USUARIO_DEMO_ID,
  saldo: null,
  setSaldo: (saldo) => set({ saldo }),
  debitar: (cantidad) =>
    set((s) => ({ saldo: s.saldo === null ? null : s.saldo - cantidad })),
}));
