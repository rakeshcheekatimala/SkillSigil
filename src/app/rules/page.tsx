import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import {
  POLICY,
  RULE_GROUPS,
  RULES,
  UNENUMERATED_GROUPS,
  rulesByGroup,
  type RuleGroup,
  type Severity,
} from "@/lib/trust/rules";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Rule catalogue",
  description:
    "Every rule the recommended-v2 policy applies before a skill is listed: what it checks, why it matters, and how to fix it.",
};

const severityClass: Record<Severity, string> = {
  critical: "bg-red-50 text-destructive ring-destructive/20",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  medium: "bg-amber-50 text-warning ring-warning/20",
  low: "bg-muted text-muted-foreground ring-border",
};

const GROUP_ORDER: RuleGroup[] = [
  "lint",
  "secrets",
  "dangerous-code",
  "package",
  "privacy",
];

export default function RulesPage() {
  const bySeverity = (severity: Severity) =>
    RULES.filter((r) => r.severity === severity).length;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          Open methodology
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Rule catalogue
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Every rule the{" "}
          <code className="font-mono text-[0.9em] text-foreground">
            {POLICY.profile}
          </code>{" "}
          policy applies before a skill is listed. Each one has a stable ID, a
          fixed severity, and a published remediation — so a finding on your
          skill is something you can look up and argue with, not a score handed
          down by a black box.
        </p>
      </div>

      <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {(["critical", "high", "medium", "low"] as Severity[]).map((severity) => (
          <div key={severity} className="bg-background px-4 py-3">
            <p className="font-mono text-2xl font-semibold tracking-tight">
              {bySeverity(severity)}
            </p>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {severity} rules
            </p>
          </div>
        ))}
      </div>

      <nav className="mt-8 flex flex-wrap gap-2">
        {GROUP_ORDER.map((group) => (
          <a
            key={group}
            href={`#${group}`}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            {RULE_GROUPS[group].label}
          </a>
        ))}
      </nav>

      <div className="mt-14 space-y-16">
        {GROUP_ORDER.map((group) => {
          const rules = rulesByGroup(group);
          const note = UNENUMERATED_GROUPS.find((g) => g.group === group)?.note;

          return (
            <section key={group} id={group} className="scroll-mt-20">
              <div className="max-w-2xl">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {RULE_GROUPS[group].gate}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {RULE_GROUPS[group].label}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {RULE_GROUPS[group].blurb}
                </p>
              </div>

              {note && (
                <p className="mt-4 max-w-2xl rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                  {note}
                </p>
              )}

              {rules.length > 0 && (
                <ul className="mt-6 divide-y divide-border border-y border-border">
                  {rules.map((rule) => (
                    <li key={rule.id}>
                      <Link
                        href={`/rules/${rule.id}`}
                        className="group flex flex-col gap-2 py-4 transition-colors sm:-mx-4 sm:flex-row sm:items-start sm:gap-5 sm:rounded-lg sm:px-4 sm:hover:bg-muted/40"
                      >
                        <div className="flex shrink-0 items-center gap-2.5 sm:w-52">
                          <span className="font-mono text-xs font-medium text-accent">
                            {rule.id}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                              severityClass[rule.severity],
                            )}
                          >
                            {rule.severity}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-medium tracking-tight text-foreground">
                            {rule.title}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {rule.check}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
                          <span
                            className={cn(
                              "font-mono text-[10px] uppercase tracking-wider",
                              rule.preflight
                                ? "text-accent"
                                : "text-muted-foreground",
                            )}
                          >
                            {rule.preflight ? "web + CLI" : "CLI only"}
                          </span>
                          <ArrowUpRight
                            weight="bold"
                            className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-20 border-t border-border pt-10">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold tracking-tight">
            Where these rules come from
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The catalogue is transcribed from the SkillTrustOps scanner docs. The
            scanner is MIT-licensed and installable, so you can run the same
            policy over the same skill and compare our answer to yours — which is
            the only reason to believe either of us.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <a
              href={POLICY.scannerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
            >
              Scanner source
              <ArrowUpRight className="size-3.5" />
            </a>
            <a
              href={POLICY.packageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
            >
              PyPI package
              <ArrowUpRight className="size-3.5" />
            </a>
            <Link
              href="/methodology"
              className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
            >
              How scanning works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
