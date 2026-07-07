"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/section-header";
import { NewsCard } from "@/components/cards/news-card";
import { getNoticias, ApiRequestError, type Noticia } from "@/lib/api";

/**
 * Feed de noticias del Home (doc 11 + rediseño imagen-protagonista):
 *  §1 "Portada" — bento: 1 hero (2 col × 2 filas) + 1 lateral + fila de 3.
 *  §2 "Más noticias" — grid de 3 columnas con "Ver más" por cursor.
 * En mobile todo colapsa a columna única (el hero conserva su tamaño).
 */
export function NewsFeed() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [cargandoMas, setCargandoMas] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const primeraCarga = useRef(true);

  const cargar = useCallback(async (siguienteCursor?: string) => {
    try {
      const r = await getNoticias(siguienteCursor, siguienteCursor ? 9 : 14);
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

  if (estado === "loading") {
    return (
      <section>
        <SectionHeader title="Noticias" />
        <div className="grid gap-3 lg:grid-cols-3">
          <Skeleton className="min-h-72 lg:col-span-2 lg:row-span-2" />
          <Skeleton className="min-h-56" />
          <Skeleton className="min-h-56" />
          <Skeleton className="hidden min-h-56 lg:block" />
          <Skeleton className="hidden min-h-56 lg:block" />
        </div>
      </section>
    );
  }

  if (estado === "error") {
    return (
      <section>
        <SectionHeader title="Noticias" />
        <Card>
          <CardContent className="py-8 text-center text-sm text-foreground-secondary">
            {mensajeError}
          </CardContent>
        </Card>
      </section>
    );
  }

  if (noticias.length === 0) {
    return (
      <section>
        <SectionHeader title="Noticias" />
        <Card>
          <CardContent className="py-8 text-center text-sm text-foreground-secondary">
            El feed se está llenando — vuelve en unos minutos.
          </CardContent>
        </Card>
      </section>
    );
  }

  // §1 Portada (bento de 5) + §2 resto en grid de 3
  const portada = noticias.slice(0, 5);
  const resto = noticias.slice(5);
  const [heroe, lateral, ...fila] = portada;

  return (
    <div className="flex flex-col gap-2">
      <section>
        <SectionHeader title="Noticias" />
        <div className="grid gap-3 lg:grid-cols-3">
          {heroe && (
            <NewsCard
              noticia={heroe}
              variant="hero"
              className="lg:col-span-2 lg:row-span-2"
            />
          )}
          {lateral && <NewsCard noticia={lateral} className="lg:row-span-2" />}
          {fila.map((n) => (
            <NewsCard key={n.id} noticia={n} />
          ))}
        </div>
      </section>

      {resto.length > 0 && (
        <section>
          <SectionHeader title="Más noticias" />
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 lg:grid-cols-3">
              {resto.map((n) => (
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
        </section>
      )}
    </div>
  );
}
