"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/section-header";
import { NewsCard } from "@/components/cards/news-card";
import { getNoticias, ApiRequestError, type Noticia } from "@/lib/api";

/** Feed de noticias del Home (doc 11): paginado por cursor, con "Ver más". */
export function NewsFeed() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [cargandoMas, setCargandoMas] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const primeraCarga = useRef(true);

  const cargar = useCallback(async (siguienteCursor?: string) => {
    try {
      const r = await getNoticias(siguienteCursor);
      setNoticias((prev) =>
        siguienteCursor ? [...prev, ...r.noticias] : r.noticias,
      );
      setCursor(r.nextCursor);
      setEstado("ok");
    } catch (e) {
      setMensajeError(
        e instanceof ApiRequestError ? e.error.mensaje : "Error inesperado",
      );
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false;
      void cargar();
    }
  }, [cargar]);

  return (
    <section>
      <SectionHeader title="Noticias" />

      {estado === "loading" && (
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {estado === "error" && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-foreground-secondary">
            {mensajeError}
          </CardContent>
        </Card>
      )}

      {estado === "ok" && noticias.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-foreground-secondary">
            El feed se está llenando — vuelve en unos minutos.
          </CardContent>
        </Card>
      )}

      {estado === "ok" && noticias.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {noticias.map((n) => (
              <NewsCard key={n.id} noticia={n} />
            ))}
          </div>
          {cursor && (
            <Button
              variant="secondary"
              size="sm"
              disabled={cargandoMas}
              onClick={async () => {
                setCargandoMas(true);
                await cargar(cursor);
                setCargandoMas(false);
              }}
            >
              {cargandoMas ? "Cargando…" : "Ver más noticias"}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
