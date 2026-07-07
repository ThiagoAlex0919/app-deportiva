"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { haceCuanto } from "@/components/cards/news-card";
import { getNoticia, ApiRequestError, type Noticia } from "@/lib/api";

/** Detalle interno de la noticia con CTA al medio original (crédito). */
export function NoticiaDetalle({ id }: { id: string }) {
  const router = useRouter();
  const [noticia, setNoticia] = useState<Noticia | null>(null);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    let activo = true;
    getNoticia(id)
      .then((n) => {
        if (!activo) return;
        setNoticia(n);
        setEstado("ok");
      })
      .catch((e) => {
        if (!activo) return;
        setMensajeError(
          e instanceof ApiRequestError ? e.error.mensaje : "Error inesperado",
        );
        setEstado("error");
      });
    return () => {
      activo = false;
    };
  }, [id]);

  return (
    <div className="flex flex-col gap-4 lg:mx-auto lg:max-w-2xl">
      <button
        onClick={() => router.back()}
        className="mt-4 flex size-10 items-center justify-center rounded-full bg-surface-raised text-foreground-secondary"
        aria-label="Volver"
      >
        <ArrowLeft size={20} />
      </button>

      {estado === "loading" && (
        <>
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </>
      )}

      {estado === "error" && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-foreground-secondary">
            {mensajeError}
          </CardContent>
        </Card>
      )}

      {estado === "ok" && noticia && (
        <article className="flex flex-col gap-4 pb-8">
          {noticia.imagenUrl && (
            <img
              src={noticia.imagenUrl}
              alt=""
              className="aspect-video w-full rounded-card object-cover"
            />
          )}

          <p className="text-[13px] font-semibold uppercase tracking-wide text-foreground-secondary">
            {noticia.fuente} · {haceCuanto(noticia.publicadaEn)}
          </p>

          <h1 className="text-2xl font-black leading-tight lg:text-3xl">
            {noticia.titulo}
          </h1>

          {noticia.resumen && (
            <p className="text-[16px] leading-relaxed text-foreground-secondary">
              {noticia.resumen}
            </p>
          )}

          {/* El artículo completo pertenece al medio: CTA con crédito. */}
          <Button asChild variant="primary" size="lg" className="mt-2">
            <a href={noticia.url} target="_blank" rel="noopener noreferrer">
              Leer completo en {noticia.fuente}
              <ExternalLink size={17} />
            </a>
          </Button>
        </article>
      )}
    </div>
  );
}
