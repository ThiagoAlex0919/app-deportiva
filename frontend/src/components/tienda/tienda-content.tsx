"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/shared/section-header";
import { useSesion } from "@/components/auth/require-session";
import {
  getProductos,
  getBalance,
  getMisOrdenes,
  crearOrden,
  ApiRequestError,
  type Producto,
  type ReglasDescuento,
  type OrdenMarketplace,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Tienda (doc 15): catálogo imagen-protagonista, panel de compra con
 * simulador de descuento por Tickets en vivo, y mis pedidos con estado.
 * v1 sin pasarela: la orden queda pendiente de pago (coordinación manual).
 */
export function TiendaContent() {
  const { listo, autenticado } = useSesion();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [reglas, setReglas] = useState<ReglasDescuento | null>(null);
  const [ordenes, setOrdenes] = useState<OrdenMarketplace[]>([]);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [estado, setEstado] = useState<"loading" | "ok" | "error">("loading");
  const [mensajeError, setMensajeError] = useState("");
  const [comprando, setComprando] = useState<Producto | null>(null);

  useEffect(() => {
    let activo = true;
    getProductos()
      .then((r) => {
        if (!activo) return;
        setProductos(r.productos);
        setReglas(r.reglas);
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
  }, []);

  // Datos personales solo con sesión (saldo para el simulador + pedidos).
  useEffect(() => {
    if (!listo || !autenticado) return;
    getBalance()
      .then((r) => setSaldo(r.saldo))
      .catch(() => undefined);
    getMisOrdenes()
      .then((r) => setOrdenes(r.ordenes))
      .catch(() => undefined);
  }, [listo, autenticado]);

  if (estado === "loading") {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (estado === "error") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-foreground-secondary">
          {mensajeError}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* CATÁLOGO */}
      <section>
        <SectionHeader title="Artículos deportivos" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {productos.map((p) => (
            <ProductoCard
              key={p.slug}
              producto={p}
              reglas={reglas}
              onComprar={() => setComprando(p)}
            />
          ))}
        </div>
      </section>

      {/* MIS PEDIDOS */}
      {autenticado && ordenes.length > 0 && (
        <section>
          <SectionHeader title="Mis pedidos" />
          <div className="grid gap-2 lg:grid-cols-2">
            {ordenes.map((o) => (
              <OrdenCard key={o.id} orden={o} />
            ))}
          </div>
        </section>
      )}

      {/* PANEL DE COMPRA */}
      {comprando && reglas && (
        <PanelCompra
          producto={comprando}
          reglas={reglas}
          saldo={saldo}
          autenticado={Boolean(listo && autenticado)}
          onCerrar={() => setComprando(null)}
          onExito={(orden) => {
            setOrdenes((prev) => [orden, ...prev]);
            setSaldo((s) => (s === null ? s : s - orden.ticketsUsados));
            setComprando(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------ Catálogo -------------------------------- */

function ProductoCard({
  producto,
  reglas,
  onComprar,
}: {
  producto: Producto;
  reglas: ReglasDescuento | null;
  onComprar: () => void;
}) {
  return (
    <button
      onClick={onComprar}
      className="group flex flex-col overflow-hidden rounded-card bg-surface text-left transition-colors active:bg-surface-raised lg:hover:bg-surface-raised"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        {producto.imagenUrl ? (
          <img
            src={producto.imagenUrl}
            alt={producto.nombre}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-surface-overlay to-surface" />
        )}
        {reglas && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ticket px-2.5 py-1 text-[11px] font-bold text-ticket-foreground">
            <Ticket size={12} />
            Hasta −{reglas.maxDescuentoPorcentaje}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 text-[14px] font-bold leading-tight">
          {producto.nombre}
        </span>
        <span className="nums mt-auto text-[15px] font-black">
          {cop(producto.precioCop)}
        </span>
      </div>
    </button>
  );
}

/* --------------------------- Panel de compra ----------------------------- */

function PanelCompra({
  producto,
  reglas,
  saldo,
  autenticado,
  onCerrar,
  onExito,
}: {
  producto: Producto;
  reglas: ReglasDescuento;
  saldo: number | null;
  autenticado: boolean;
  onCerrar: () => void;
  onExito: (orden: OrdenMarketplace) => void;
}) {
  const [tickets, setTickets] = useState(0);
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Tope de tickets: min(saldo, tope % del precio).
  const topeCop = Math.floor(
    (producto.precioCop * reglas.maxDescuentoPorcentaje) / 100,
  );
  const maxTickets = Math.min(
    saldo ?? 0,
    Math.floor(topeCop / reglas.valorTicketCop),
  );
  const descuento = tickets * reglas.valorTicketCop;
  const total = producto.precioCop - descuento;

  const confirmar = async () => {
    setEnviando(true);
    try {
      const orden = await crearOrden({
        productoSlug: producto.slug,
        ticketsAUsar: tickets,
        direccion,
        telefono,
      });
      toast.success(
        "¡Pedido creado! Te contactaremos para coordinar el pago y el envío.",
      );
      onExito(orden);
    } catch (e) {
      toast.error(
        e instanceof ApiRequestError ? e.error.mensaje : "Error inesperado",
      );
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 lg:items-center lg:p-6"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-card bg-surface p-5 lg:rounded-card"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold leading-tight">
              {producto.nombre}
            </h2>
            {producto.descripcion && (
              <p className="mt-1 text-[13px] text-foreground-secondary">
                {producto.descripcion}
              </p>
            )}
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-foreground-secondary"
          >
            <X size={18} />
          </button>
        </div>

        {!autenticado ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-center text-sm text-foreground-secondary">
              Inicia sesión para comprar y usar tus Tickets como descuento.
            </p>
            <Button asChild variant="primary">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Simulador de descuento */}
            <div className="rounded-row bg-surface-raised p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold">
                  Usa tus Tickets como descuento
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-ticket-muted px-2.5 py-1 text-[12px] font-bold text-ticket">
                  <Ticket size={13} />
                  {saldo === null ? "…" : saldo.toLocaleString("es-CO")}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, maxTickets)}
                value={tickets}
                onChange={(e) => setTickets(Number(e.target.value))}
                className="w-full accent-[var(--td-ticket)]"
              />
              <div className="mt-1 flex justify-between text-[12px] text-foreground-secondary">
                <span>
                  {tickets.toLocaleString("es-CO")} Tickets = −{cop(descuento)}
                </span>
                <span>máx {maxTickets.toLocaleString("es-CO")}</span>
              </div>
              <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-[14px]">
                <div className="flex justify-between text-foreground-secondary">
                  <span>Precio</span>
                  <span className="nums">{cop(producto.precioCop)}</span>
                </div>
                <div className="flex justify-between text-foreground-secondary">
                  <span>Descuento Tickets</span>
                  <span className="nums">−{cop(descuento)}</span>
                </div>
                <div className="flex justify-between text-[16px] font-black">
                  <span>Total a pagar</span>
                  <span className="nums">{cop(total)}</span>
                </div>
              </div>
            </div>

            {/* Datos de entrega */}
            <Input
              placeholder="Dirección de entrega"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              autoComplete="street-address"
            />
            <Input
              type="tel"
              placeholder="Teléfono de contacto"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              autoComplete="tel"
            />

            <Button
              variant="cta"
              size="lg"
              fullWidth
              disabled={enviando || direccion.trim().length < 8 || telefono.trim().length < 7}
              onClick={confirmar}
            >
              {enviando ? "Creando pedido…" : `Confirmar pedido · ${cop(total)}`}
            </Button>
            <p className="text-center text-[12px] text-foreground-muted">
              El pago se coordina contigo tras crear el pedido (v1 sin pasarela).
              Los Tickets del descuento se descuentan de inmediato y se
              devuelven si el pedido se cancela.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Mis pedidos ------------------------------ */

const ETIQUETAS_ESTADO: Record<string, { texto: string; clase: string }> = {
  PENDIENTE_PAGO: {
    texto: "Pendiente de pago",
    clase: "bg-warning/10 text-warning",
  },
  PAGADA: { texto: "Pagada", clase: "bg-success/10 text-success" },
  ENVIADA: { texto: "Enviada", clase: "bg-surface-overlay text-foreground" },
  ENTREGADA: { texto: "Entregada", clase: "bg-success/10 text-success" },
  CANCELADA: {
    texto: "Cancelada",
    clase: "bg-surface-overlay text-foreground-muted",
  },
};

function OrdenCard({ orden }: { orden: OrdenMarketplace }) {
  const etiqueta = ETIQUETAS_ESTADO[orden.estado] ?? {
    texto: orden.estado,
    clase: "bg-surface-overlay text-foreground-secondary",
  };
  return (
    <div className="flex items-center gap-3 rounded-row bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold">{orden.productoNombre}</p>
        <p className="text-[12px] text-foreground-secondary">
          <span className="nums">{cop(orden.totalCop)}</span>
          {orden.ticketsUsados > 0 && (
            <> · {orden.ticketsUsados.toLocaleString("es-CO")} 🎟 usados</>
          )}
          {" · "}
          {new Date(orden.createdAt).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
          etiqueta.clase,
        )}
      >
        {etiqueta.texto}
      </span>
    </div>
  );
}
