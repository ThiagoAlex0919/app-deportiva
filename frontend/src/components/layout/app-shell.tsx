import { BottomTabBar } from "./bottom-tab-bar";
import { SideNav } from "./side-nav";

/**
 * Shell responsive:
 *  - Mobile: columna única max-w 480px + BottomTabBar fijo (app nativa).
 *  - Desktop (lg+): SideNav fija a la izquierda + contenido hasta 1024px.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background lg:pl-60">
      <SideNav />
      <main className="mx-auto w-full max-w-[480px] px-4 pb-[calc(80px+env(safe-area-inset-bottom))] lg:max-w-5xl lg:px-8 lg:pb-12">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
