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
  children,
}: {
  evento: EventoCatalogo;
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
      <CardContent className="relative flex flex-col gap-4">
        <div className="flex items-center justify-center gap-2 text-[13px] text-foreground-secondary">
          <span className="font-semibold text-foreground">
            {evento.competicion.nombre}
          </span>
          {evento.fase && <span>· {evento.fase}</span>}
        </div>

        {esEquipos ? (
          <VersusLayout evento={evento} dia={dia} hora={hora} />
        ) : (
          <RaceLayout evento={evento} dia={dia} hora={hora} />
        )}

        {children}
      </CardContent>
    </Card>
  );
}

/* ------------------------------ EQUIPOS --------------------------------- */

function VersusLayout({
  evento,
  dia,
  hora,
}: {
  evento: EventoCatalogo;
  dia: string;
  hora: string;
}) {
  const local = evento.participantes.find((p) => p.rol === "LOCAL");
  const visitante = evento.participantes.find((p) => p.rol === "VISITANTE");
  return (
    <div className="flex items-center justify-between">
      <Escudo nombre={local?.nombre ?? "?"} />
      <div className="flex flex-col items-center">
        <span className="text-[13px] text-foreground-secondary">{dia}</span>
        <span className="nums text-4xl font-black tracking-tight">{hora}</span>
      </div>
      <Escudo nombre={visitante?.nombre ?? "?"} />
    </div>
  );
}

/** Escudo placeholder: iniciales en círculo hasta tener assets reales. */
function Escudo({ nombre, className }: { nombre: string; className?: string }) {
  const iniciales = nombre
    .split(" ")
    .filter((w) => w[0] === w[0]?.toUpperCase())
    .map((w) => w[0])
    .join("")
    .slice(0, 3);
  return (
    <div className={cn("flex w-24 flex-col items-center gap-2", className)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-overlay text-lg font-bold ring-1 ring-border">
        {iniciales}
      </span>
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
          <stop offset="0%" stopColor="#12351f" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#cesped)" />
      <g stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1.5" fill="none">
        <line x1="0" y1="150" x2="400" y2="150" />
        <circle cx="200" cy="150" r="46" />
        <circle cx="200" cy="150" r="3" fill="#ffffff" fillOpacity="0.05" />
        <rect x="120" y="-40" width="160" height="70" rx="2" />
        <rect x="120" y="270" width="160" height="70" rx="2" />
      </g>
    </svg>
  );
}
