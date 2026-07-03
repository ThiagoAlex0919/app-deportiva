import { BottomTabBar } from "./bottom-tab-bar";

/**
 * Contenedor mobile-first: columna única max-w 480px centrada en desktop,
 * fondo negro, padding inferior para el tab bar fijo + safe-area PWA.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      <main className="flex-1 px-4 pb-[calc(80px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
