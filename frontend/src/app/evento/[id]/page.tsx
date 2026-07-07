import { EventoDetalle } from "@/components/sports/evento-detalle";

/**
 * Página de detalle de partido (doc 13): marcador vivo, cronología,
 * camino en el torneo, ficha y pronóstico. Todo condicional según lo
 * que el proveedor entregue para ese evento.
 */
export default async function EventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventoDetalle id={id} />;
}
