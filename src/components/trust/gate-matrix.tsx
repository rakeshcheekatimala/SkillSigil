import { cn } from "@/lib/utils";

export type GateState = "passed" | "findings" | "partial" | "not-assessed";

export type Gate = {
  name: string;
  state: GateState;
  detail: string;
};

const stateCopy: Record<GateState, { label: string; className: string; dot: string }> = {
  passed: {
    label: "PASSED",
    className: "text-accent",
    dot: "bg-accent",
  },
  findings: {
    label: "FINDINGS",
    className: "text-destructive",
    dot: "bg-destructive",
  },
  partial: {
    label: "SUBSET",
    className: "text-warning",
    dot: "bg-warning",
  },
  "not-assessed": {
    label: "NOT ASSESSED",
    className: "text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
};

/**
 * Modelled on the scanner's `certify` output: a gate that did not run is shown
 * as NOT ASSESSED rather than being folded into an overall pass.
 */
export function GateMatrix({
  gates,
  className,
}: {
  gates: Gate[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2",
        className,
      )}
    >
      {gates.map((gate) => {
        const state = stateCopy[gate.state];
        return (
          <div key={gate.name} className="bg-background px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm font-medium text-foreground">{gate.name}</dt>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider",
                  state.className,
                )}
              >
                <span className={cn("size-1.5 rounded-full", state.dot)} />
                {state.label}
              </span>
            </div>
            <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {gate.detail}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
