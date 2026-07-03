import { Card, CardContent } from "@/components/ui/card";

/**
 * Tarjeta de partido destacada (hero del Home) según referencias_ui/home.jpeg.
 * Slot inferior para PredictionWidget u otras acciones.
 */
export function MatchCard({
  competicion,
  fecha,
  hora,
  local,
  visitante,
  children,
}: {
  competicion: string;
  fecha: string;
  hora: string;
  local: { nombre: string; inicial: string };
  visitante: { nombre: string; inicial: string };
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <p className="text-center text-[13px] text-foreground-secondary">
          {competicion}
        </p>
        <div className="flex items-center justify-between">
          <Equipo nombre={local.nombre} inicial={local.inicial} />
          <div className="flex flex-col items-center">
            <span className="text-[13px] text-foreground-secondary">
              {fecha}
            </span>
            <span className="nums text-3xl font-black tracking-tight">
              {hora}
            </span>
          </div>
          <Equipo nombre={visitante.nombre} inicial={visitante.inicial} />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** Escudo placeholder (inicial en círculo) hasta tener assets reales. */
function Equipo({ nombre, inicial }: { nombre: string; inicial: string }) {
  return (
    <div className="flex w-24 flex-col items-center gap-2">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-overlay text-xl font-bold">
        {inicial}
      </span>
      <span className="line-clamp-2 text-center text-[13px] font-medium">
        {nombre}
      </span>
    </div>
  );
}
