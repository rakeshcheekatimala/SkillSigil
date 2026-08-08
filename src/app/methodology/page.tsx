import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { GateMatrix } from "@/components/trust/gate-matrix";
import { CopyField } from "@/components/ui/copy-field";
import { DECISIONS } from "@/lib/trust/decision";
import { POLICY } from "@/lib/trust/rules";

export const metadata: Metadata = {
  title: "How scanning works",
  description:
    "The three gates, the decision vocabulary, the inspection bounds, and what a passing scan does not prove.",
};

const EXIT_CODES = [
  { code: "0", meaning: "No unsuppressed findings, or behavioural testing returned passed_scope." },
  { code: "1", meaning: "Findings were reported, or behavioural testing returned blocked." },
  { code: "2", meaning: "Configuration, input, provider, or scanner error prevented a reliable result." },
  { code: "3", meaning: "Behavioural testing was inconclusive. It must never be converted into a pass." },
];

const NOT_PROVEN = [
  "Whether a detected credential is currently active.",
  "Every provider-specific secret format.",
  "Whether a dangerous-looking instruction is safe in its broader operational context.",
  "Semantic program analysis across arbitrary languages.",
  "How a model behaves under adversarial input, unless red-team testing was run against a live provider.",
];

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          Open methodology
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          How a skill gets admitted
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Publishing here runs the skill through{" "}
          <a
            href={POLICY.scannerUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent hover:underline"
          >
            SkillTrustOps
          </a>{" "}
          under the{" "}
          <code className="font-mono text-[0.9em] text-foreground">
            {POLICY.profile}
          </code>{" "}
          policy. The scan is deterministic, runs without network access, and
          never executes the submitted skill. You get the rule IDs, the evidence,
          and the policy hash — enough to reproduce the result yourself and
          disagree with it.
        </p>
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">Three gates</h2>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A skill is evaluated in stages: does it conform, does it contain
          hostile content, and does a model misbehave when attacked. Registry
          scans run the first two. Behavioural testing needs a model provider, so
          it is reported as not assessed rather than quietly assumed.
        </p>
        <GateMatrix
          className="mt-6 max-w-4xl"
          gates={[
            {
              name: "Gate 1 — structure",
              state: "passed",
              detail:
                "The agent-skills-specification ruleset: front matter, naming, and package layout, so a runtime loads the skill predictably.",
            },
            {
              name: "Gate 2 — security and privacy",
              state: "passed",
              detail:
                "Secrets, dangerous instructions, prompt injection, obfuscation, persistence, exfiltration, permissions, lifecycle hooks, archives, unpinned dependencies, cross-file delegation, and PII.",
            },
            {
              name: "Gate 3 — behaviour under attack",
              state: "not-assessed",
              detail:
                "Red-team testing against a live model provider. Not run by the registry; run it yourself with the CLI before trusting a skill in a sensitive workflow.",
            },
            {
              name: "Publisher identity",
              state: "not-assessed",
              detail:
                "Push access to the source repository is checked at publish time. Cryptographic publisher signing is not implemented yet and is not claimed anywhere in the UI.",
            },
          ]}
        />
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          What a decision means
        </h2>
        <div className="mt-6 max-w-4xl divide-y divide-border border-y border-border">
          {Object.values(DECISIONS)
            .filter(
              (decision, index, all) =>
                all.findIndex((d) => d.code === decision.code) === index,
            )
            .map((decision) => (
              <div
                key={decision.code}
                className="flex flex-col gap-1.5 py-4 sm:flex-row sm:gap-6"
              >
                <div className="sm:w-48 sm:shrink-0">
                  <p className="font-mono text-xs font-medium text-accent">
                    {decision.code}
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{decision.label}</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {decision.meaning}
                </p>
              </div>
            ))}
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          There is no letter grade and no composite safety number. The scanner
          groups and prioritises findings without inventing a score, and the
          registry does not add one on top — a single digit would hide exactly
          the detail you need to make a decision.
        </p>
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Exit codes</h2>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            The same contract the CLI uses in CI, so a pipeline and this registry
            agree on what happened.
          </p>
          <dl className="mt-6 divide-y divide-border border-y border-border">
            {EXIT_CODES.map((row) => (
              <div key={row.code} className="flex gap-5 py-3">
                <dt className="w-6 shrink-0 font-mono text-sm font-semibold text-accent">
                  {row.code}
                </dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  {row.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Inspection bounds
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            The scanner reads the complete package under hard limits. Exceeding a
            bound is an error, never a pass.
          </p>
          <dl className="mt-6 divide-y divide-border border-y border-border">
            {POLICY.bounds.map((bound) => (
              <div
                key={bound.label}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <dt className="text-sm text-muted-foreground">{bound.label}</dt>
                <dd className="font-mono text-xs font-medium">{bound.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight">
          What a passing scan does not prove
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          A pass means the configured deterministic detectors found no matching
          pattern in the bounded package snapshot. It does not prove the skill is
          safe. Specifically, the scan does not determine:
        </p>
        <ul className="mt-5 space-y-2.5">
          {NOT_PROVEN.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed">
              <span
                aria-hidden
                className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
              />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 rounded-lg border border-border bg-muted/40 px-4 py-3.5 text-sm leading-relaxed text-foreground">
          Stating these limits is the point. A registry that implies a scan
          equals safety is selling a feeling; one that publishes its blind spots
          lets you decide how much weight the result deserves.
        </p>
      </section>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight">
          Reproduce any result
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Every report records the tool version, the effective policy profile and
          its SHA-256 hash, the scanned commit, and{" "}
          <code className="font-mono text-[0.9em] text-foreground">
            deterministic: true
          </code>
          . Install the scanner and run the same policy over the same commit; the
          findings should match ours exactly.
        </p>
        <div className="mt-5 space-y-3">
          <CopyField
            label="Install"
            value="python -m pip install skilltrustops"
          />
          <CopyField
            label="Scan"
            value={`skilltrustops policy init --profile ${POLICY.profile} && skilltrustops scan path/to/skill --format json`}
          />
        </div>
      </section>

      <section className="mt-16 max-w-3xl border-t border-border pt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Scanner benchmark, stated plainly
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The scanner&apos;s published benchmark ran 605 public skills with no
          model and no API key: 137 passed the selected policy and 468 produced
          findings, with zero scanner errors. Those counts are not labels of safe
          or malicious content — the public corpus has no adjudicated ground
          truth. They describe how the policy behaves at scale, nothing more.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link
            href="/rules"
            className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
          >
            Browse the rule catalogue
          </Link>
          <Link
            href="/scan"
            className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
          >
            Run a preflight scan
          </Link>
          <a
            href={POLICY.scannerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
          >
            Scanner source
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
