import { HomeHeader } from "@/components/layout/page-header";
import { HomeContent } from "@/components/home/home-content";

/**
 * A. Home (Feed y Contenido) — 04_sitemap_y_ux.md §1.A
 * Eventos reales del catálogo (SportsModule, doc 08); el widget de
 * pronóstico se elige por deporte.formato. El feed de noticias llegará
 * con el módulo de contenido.
 */
export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <HomeHeader />
      <HomeContent />
    </div>
  );
}
