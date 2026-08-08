import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { NormalisedFinding } from "@/lib/trust/decision";
import { getRule, type Severity } from "@/lib/trust/rules";
import { cn } from "@/lib/utils";

const severityClass: Record<Severity, string> = {
  critical: "bg-red-50 text-destructive ring-destructive/20",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  medium: "bg-amber-50 text-warning ring-warning/20",
  low: "bg-muted text-muted-foreground ring-border",
};

/**
 * The explainable half of the trust report: every finding names the rule that
 * produced it, links to what that rule checks, and states the remediation.
 */
export function FindingsTable({
  findings,
  className,
}: {
  findings: NormalisedFinding[];
  className?: string;
}) {
  if (!findings.length) return null;

  return (
    <ul className={cn("divide-y divide-border border-y border-border", className)}>
      {findings.map((finding, index) => {
        const rule = getRule(finding.ruleId);
        return (
          <li
            key={`${finding.ruleId}-${finding.line ?? index}`}
            className="py-4 first:pt-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                  severityClass[finding.severity],
                )}
              >
                {finding.severity}
              </span>

              {rule ? (
                <Link
                  href={`/rules/${finding.ruleId}`}
                  className="inline-flex items-center gap-1 font-mono text-xs font-medium text-accent hover:underline"
                >
                  {finding.ruleId}
                  <ArrowUpRight className="size-3" />
                </Link>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">
                  {finding.ruleId}
                </span>
              )}

              <span className="text-sm font-medium text-foreground">
                {rule?.title ?? finding.message}
              </span>

              {(finding.path || finding.line) && (
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  {finding.path ?? "SKILL.md"}
                  {finding.line ? `:${finding.line}` : ""}
                </span>
              )}
            </div>

            {finding.evidence && (
              <pre className="mt-2.5 overflow-x-auto rounded-md border border-border bg-muted/40 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground/75">
                <code>{finding.evidence}</code>
              </pre>
            )}

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {rule ? rule.action : finding.message}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
