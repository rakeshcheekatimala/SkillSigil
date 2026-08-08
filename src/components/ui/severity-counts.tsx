import { cn } from "@/lib/utils";
import type { SeverityCounts } from "@/lib/trust/decision";

const ORDER = [
  { key: "critical", label: "critical", className: "text-destructive" },
  { key: "high", label: "high", className: "text-orange-600" },
  { key: "medium", label: "medium", className: "text-warning" },
  { key: "low", label: "low", className: "text-muted-foreground" },
] as const;

/**
 * Evidence at a glance. Renders nothing when there is no scan to describe,
 * rather than implying a clean result.
 */
export function SeverityCountsRow({
  counts,
  className,
  emphasiseZero = false,
}: {
  counts: SeverityCounts;
  className?: string;
  /** Show an explicit zero line instead of collapsing to nothing. */
  emphasiseZero?: boolean;
}) {
  const present = ORDER.filter((s) => counts[s.key] > 0);

  if (!present.length) {
    if (!emphasiseZero) return null;
    return (
      <span className={cn("font-mono text-[11px] text-accent", className)}>
        0 findings
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-2 font-mono text-[11px]", className)}
    >
      {present.map((s) => (
        <span key={s.key} className={s.className}>
          {counts[s.key]} {s.label}
        </span>
      ))}
    </span>
  );
}
