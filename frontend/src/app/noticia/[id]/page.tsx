import { NoticiaDetalle } from "@/components/home/noticia-detalle";

/**
 * Página interna de una noticia (doc 11 + rediseño).
 * Muestra lo que el agregador posee legalmente (titular, resumen, imagen,
 * fuente) y un CTA al artículo completo en el medio original — el usuario
 * solo abandona la app si quiere leerlo entero.
 */
export default async function NoticiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NoticiaDetalle id={id} />;
}
