import { STATUS_LABEL, type StatusPO } from "@/lib/po";
import { cn } from "@/lib/utils";

const estilos: Record<StatusPO, string> = {
  pendente_aprovacao: "bg-warning/20 text-warning-foreground border-warning/50",
  aprovado: "bg-success/15 text-success border-success/40",
  rejeitado: "bg-destructive/12 text-destructive border-destructive/40",
  enviado: "bg-info/12 text-info border-info/40",
};

export function StatusBadge({
  status,
  className,
}: {
  status: StatusPO;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        estilos[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
