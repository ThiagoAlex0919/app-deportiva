import type { EventoCatalogo } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Tarjeta destacada del evento seleccionado en el Home (doc 08).
 * El layout cambia según `deporte.formato` (patrón Strategy de la UI):
 *  - EQUIPOS: enfrentamiento local vs visitante sobre una "cancha" sutil.
 *  - MULTITUDINARIO: cabecera de carrera con la parrilla de participantes.
 * El slot `children` recibe el panel de pronóstico.
 */
export function EventCard({
  evento,
  minuto,
  horizontal = false,
  children,
}: {
  evento: EventoCatalogo;
  /** Minuto de juego fresco (detalle, caché 60s) — solo llega EN VIVO. */
  minuto?: string | null;
  /** true (Home): en lg+ el versus va a la izquierda y el slot a la derecha. */
  horizontal?: boolean;
  children?: React.ReactNode;
}) {
  const esEquipos = evento.deporte.formato === "EQUIPOS";
  const fecha = new Date(evento.fechaInicio);
  const dia = fecha.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const hora = fecha.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <Card className="relative overflow-hidden">
      {/* Decoración futbolera: líneas de cancha en trazo casi imperceptible.
          Solo neutros — el acento sigue reservado a Tickets (design system). */}
      {esEquipos && <PitchLines />}
      <CardContent
        className={cn(
          "relative flex flex-col gap-4",
          horizontal &&
            children &&
            "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center lg:gap-8",
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2 text-[13px] text-foreground-secondary">
            <span className="font-semibold text-foreground">
              {evento.competicion.nombre}
            </span>
            {evento.fase && <span>· {evento.fase}</span>}
          </div>

          {esEquipos ? (
            <VersusLayout
              evento={evento}
              dia={dia}
              hora={hora}
              minuto={minuto}
            />
          ) : (
            <RaceLayout evento={evento} dia={dia} hora={hora} />
          )}
        </div>

        {children && <div>{children}</div>}
      </CardContent>
    </Card>
  );
}

/* ------------------------------ EQUIPOS --------------------------------- */

function VersusLayout({
  evento,
  dia,
  hora,
  minuto,
}: {
  evento: EventoCatalogo;
  dia: string;
  hora: string;
  minuto?: string | null;
}) {
  const local = evento.participantes.find((p) => p.rol === "LOCAL");
  const visitante = evento.participantes.find((p) => p.rol === "VISITANTE");
  const enVivo = evento.estado === "EN_VIVO";
  return (
    <div className="flex items-center justify-between">
      <Escudo nombre={local?.nombre ?? "?"} imagenUrl={local?.imagenUrl} />
      <div className="flex flex-col items-center gap-1.5">
        {enVivo ? (
          <>
            {evento.marcador && (
              <span className="nums text-4xl font-black tracking-tight">
                {evento.marcador[0]} - {evento.marcador[1]}
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-live/10 px-3 py-1 text-[13px] font-bold text-live">
              <span className="size-1.5 animate-pulse rounded-full bg-live" />
              {minuto ? `${minuto}'` : "EN VIVO"}
            </span>
          </>
        ) : (
          <>
            <span className="text-[13px] text-foreground-secondary">
              {dia}
            </span>
            <span className="nums text-4xl font-black tracking-tight">
              {hora}
            </span>
          </>
        )}
      </div>
      <Escudo
        nombre={visitante?.nombre ?? "?"}
        imagenUrl={visitante?.imagenUrl}
      />
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
/** Escudo real (sync doc 12) con fallback a iniciales. */
function Escudo({
  nombre,
  imagenUrl,
  className,
}: {
  nombre: string;
  imagenUrl?: string | null;
  className?: string;
}) {
  const iniciales = nombre
    .split(" ")
    .filter((w) => w[0] === w[0]?.toUpperCase())
    .map((w) => w[0])
    .join("")
    .slice(0, 3);
  return (
    <div className={cn("flex w-24 flex-col items-center gap-2", className)}>
      {imagenUrl ? (
        <img
          src={imagenUrl}
          alt=""
          loading="lazy"
          className="size-14 object-contain drop-shadow"
        />
      ) : (
        <span className="flex size-14 items-center justify-center rounded-full bg-surface-overlay text-lg font-bold ring-1 ring-border">
          {iniciales}
        </span>
      )}
      <span className="line-clamp-2 text-center text-[13px] font-medium">
        {nombre}
      </span>
    </div>
  );
}

/* --------------------------- MULTITUDINARIO ------------------------------ */

function RaceLayout({
  evento,
  dia,
  hora,
}: {
  evento: EventoCatalogo;
  dia: string;
  hora: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-center text-xl font-bold">{evento.nombre}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] text-foreground-secondary">{dia}</span>
        <span className="nums text-3xl font-black tracking-tight">{hora}</span>
      </div>
      <div className="flex -space-x-2">
        {evento.participantes.slice(0, 6).map((p) => (
          <span
            key={p.id}
            title={p.nombre}
            className="flex size-9 items-center justify-center rounded-full bg-surface-overlay text-xs font-bold ring-2 ring-surface"
          >
            {p.nombre
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Decoración ------------------------------ */

function PitchLines() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* gradiente verde-cancha muy oscuro, casi neutro */}
      <defs>
        <radialGradient id="cesped" cx="50%" cy="0%" r="90%">
          <stop offset="0%" stopColor="#1d5a33" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1d5a33" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#cesped)" />
      {/* Trazos en el color de texto del tema (funciona en dark y light). */}
      <g
        stroke="var(--td-fg)"
        strokeOpacity="0.06"
        strokeWidth="1.5"
        fill="none"
      >
        <line x1="0" y1="150" x2="400" y2="150" />
        <circle cx="200" cy="150" r="46" />
        <circle cx="200" cy="150" r="3" fill="#ffffff" fillOpacity="0.05" />
        <rect x="120" y="-40" width="160" height="70" rx="2" />
        <rect x="120" y="270" width="160" height="70" rx="2" />
      </g>
    </svg>
  );
}
