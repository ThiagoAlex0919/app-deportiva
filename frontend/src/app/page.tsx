import { HomeHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { MatchCard } from "@/components/cards/match-card";
import { PredictionWidget } from "@/components/gamification/prediction-widget";
import { Card, CardContent } from "@/components/ui/card";

/**
 * A. Home (Feed y Contenido) — 04_sitemap_y_ux.md §1.A
 *
 * NOTA Fase 1: el evento destacado usa los IDs deterministas del seed del
 * backend (EVENTO_CLASICO). El feed real llegará con el módulo `sports`.
 */
const EVENTO_CLASICO = "00000000-0000-4000-8000-0000000000e1";

export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <HomeHeader />

      <SectionHeader title="Partido destacado" className="pb-0" />
      <MatchCard
        competicion="LaLiga · Jornada 1"
        fecha="dom, 16 ago"
        hora="19:00"
        local={{ nombre: "Real Madrid", inicial: "RM" }}
        visitante={{ nombre: "FC Barcelona", inicial: "FCB" }}
      >
        <PredictionWidget
          eventoId={EVENTO_CLASICO}
          local="Real Madrid"
          visitante="FC Barcelona"
          costoTickets={50}
        />
      </MatchCard>

      <SectionHeader title="Noticias" className="pb-0" />
      <Card>
        <CardContent className="py-8 text-center text-sm text-foreground-secondary">
          El feed de noticias llegará con el módulo de contenido.
        </CardContent>
      </Card>
    </div>
  );
}
