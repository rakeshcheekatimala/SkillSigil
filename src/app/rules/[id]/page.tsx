import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { CopyField } from "@/components/ui/copy-field";
import { POLICY, RULES, RULE_GROUPS, getRule, type Severity } from "@/lib/trust/rules";
import { cn } from "@/lib/utils";

const severityClass: Record<Severity, string> = {
  critical: "bg-red-50 text-destructive ring-destructive/20",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  medium: "bg-amber-50 text-warning ring-warning/20",
  low: "bg-muted text-muted-foreground ring-border",
};

type PageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return RULES.map((rule) => ({ id: rule.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const rule = getRule(id);
  if (!rule) return { title: "Rule not found" };
  return {
    title: `${rule.id} — ${rule.title}`,
    description: rule.check,
  };
}

export default async function RulePage({ params }: PageProps) {
  const { id } = await params;
  const rule = getRule(id);
  if (!rule) notFound();

  const group = RULE_GROUPS[rule.group];

  return (
    <article className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href="/rules"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Rule catalogue
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_320px] lg:gap-16">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm font-medium text-accent">
              {rule.id}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                severityClass[rule.severity],
              )}
            >
              {rule.severity}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {group.label}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {rule.title}
          </h1>

          <section className="mt-10 space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              What the scanner checks
            </h2>
            <p className="text-[15px] leading-relaxed text-foreground">
              {rule.check}
            </p>
          </section>

          <section className="mt-8 space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Why it matters
            </h2>
            <p className="text-[15px] leading-relaxed text-foreground">
              {rule.risk}
            </p>
          </section>

          <section className="mt-8 space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              How to fix it
            </h2>
            <p className="rounded-lg border border-accent/20 bg-accent-soft/60 px-4 py-3 text-[15px] leading-relaxed text-foreground">
              {rule.action}
            </p>
          </section>

          <section className="mt-10 space-y-3 border-t border-border pt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Inspect a finding locally
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The scanner can tie this rule back to the exact evidence in your own
              report, with no network access and without executing the skill.
            </p>
            <CopyField
              value={`skilltrustops explain ${rule.id} --report scan.json`}
            />
          </section>
        </div>

        <aside className="space-y-6 lg:pt-2">
          <div className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold">Coverage</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Gate</dt>
                <dd className="text-right font-medium">{group.gate}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Policy</dt>
                <dd className="font-mono text-xs">{POLICY.profile}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Web preflight</dt>
                <dd
                  className={cn(
                    "font-mono text-xs",
                    rule.preflight ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  {rule.preflight ? "supported" : "CLI only"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {rule.preflight
                ? "Detectable from SKILL.md alone, so the browser preflight evaluates it."
                : "Needs the full skill directory — archives, manifests, links or adjacent scripts — so only the CLI can decide it."}
            </p>
          </div>

          <div className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold">Check your own skill</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Run the preflight against any public GitHub skill before you
              publish it. No account required.
            </p>
            <Link
              href="/scan"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Open the scanner
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-dashed border-border p-5">
            <h2 className="text-sm font-semibold">Source</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This rule is defined by the SkillTrustOps scanner, not by the
              registry.
            </p>
            <a
              href={POLICY.scannerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              skilltrustops
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </aside>
      </div>
    </article>
  );
}
