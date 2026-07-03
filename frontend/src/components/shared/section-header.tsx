import { cn } from "@/lib/utils";

/** Header de sección: label uppercase pequeño gris + acción opcional. */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between py-3", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
        {title}
      </h2>
      {action}
    </div>
  );
}
