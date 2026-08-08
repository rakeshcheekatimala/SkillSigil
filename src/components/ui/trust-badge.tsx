import { cn } from "@/lib/utils";
import type { ScanStatus } from "@/data/skills";
import { decisionFor } from "@/lib/trust/decision";

const toneClass: Record<string, string> = {
  pass: "bg-accent-soft text-accent ring-accent/20",
  block: "bg-red-50 text-destructive ring-destructive/20",
  progress: "bg-amber-50 text-warning ring-warning/20",
  unknown: "bg-muted text-muted-foreground ring-border",
};

const dotClass: Record<string, string> = {
  pass: "bg-accent",
  block: "bg-destructive",
  progress: "bg-warning animate-pulse",
  unknown: "bg-muted-foreground",
};

export function TrustBadge({
  status,
  className,
  showCode = false,
}: {
  status: ScanStatus;
  className?: string;
  /** Render the scanner's own decision term alongside the label. */
  showCode?: boolean;
}) {
  const decision = decisionFor(status);

  return (
    <span
      title={`${decision.code} — ${decision.meaning}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClass[decision.tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotClass[decision.tone])} />
      {decision.label}
      {showCode && (
        <span className="font-mono text-[10px] opacity-70">{decision.code}</span>
      )}
    </span>
  );
}
