import type { Metadata } from "next";
import Link from "next/link";
import { PreflightScanner } from "@/components/scan/preflight-scanner";
import { CopyField } from "@/components/ui/copy-field";
import { POLICY, RULES } from "@/lib/trust/rules";

export const metadata: Metadata = {
  title: "Scan a skill",
  description:
    "Paste any public GitHub skill URL and get a deterministic preflight report with rule IDs, evidence and remediation. No account required.",
};

export default function ScanPage() {
  const preflightRules = RULES.filter((r) => r.preflight).length;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-20">
        <div className="min-w-0">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              Free · no account
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Scan a skill before you trust it
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Paste a GitHub URL for any skill — one you are about to publish, or
              one you are about to install. You get the rule IDs that matched, the
              redacted evidence, and what to do about each one.
            </p>
          </div>

          <div className="mt-10">
            <PreflightScanner />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold">What runs here</h2>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              A {preflightRules}-rule subset of the{" "}
              <code className="font-mono">{POLICY.profile}</code> policy that is
              decidable from <code className="font-mono">SKILL.md</code> alone.
              The scan is deterministic, reads nothing but that one file, and
              never executes it.
            </p>
            <Link
              href="/rules"
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              See every rule
            </Link>
          </div>

          <div className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold">Full coverage, locally</h2>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              Archives, symlinks, manifests, lifecycle hooks, adjacent scripts and
              PII need the whole directory. The scanner is MIT-licensed and runs
              offline.
            </p>
            <div className="mt-3">
              <CopyField value="pip install skilltrustops && skilltrustops scan ." />
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border p-5">
            <h2 className="text-sm font-semibold">Then publish it</h2>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              Publishing runs the full policy and issues a certificate anyone can
              verify against the exact commit.
            </p>
            <Link
              href="/publish"
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              Publish a skill
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
