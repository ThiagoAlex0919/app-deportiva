import { HomeHeader } from "@/components/layout/page-header";
import { HomeContent } from "@/components/home/home-content";
import { NewsFeed } from "@/components/home/news-feed";

/**
 * A. Home (Feed y Contenido) — 04_sitemap_y_ux.md §1.A
 * Eventos reales del catálogo (SportsModule, doc 08) + feed de noticias
 * agregado por RSS (ContentModule, doc 11).
 */
export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <HomeHeader />
      <HomeContent />
      <NewsFeed />
    </div>
  );
}
