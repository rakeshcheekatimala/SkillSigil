"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleNotch,
  ShieldCheck,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { FindingsTable } from "@/components/trust/findings-table";
import { GateMatrix, type GateState } from "@/components/trust/gate-matrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeverityCountsRow } from "@/components/ui/severity-counts";
import type { NormalisedFinding, SeverityCounts } from "@/lib/trust/decision";
import { cn } from "@/lib/utils";

type ScanResponse = {
  ok: true;
  target: {
    owner: string;
    repo: string;
    ref: string;
    subpath: string;
    path: string;
  };
  decision: "passed" | "failed";
  summary: string;
  counts: SeverityCounts;
  findings: NormalisedFinding[];
  provenance: {
    scanner: string;
    policyProfile: string;
    policyHash: string;
    durationMs: number;
    bytes: number;
    truncated: boolean;
    maxBytes: number;
    deterministic: boolean;
    executed: boolean;
  };
  notAssessed: string[];
  registrySlug: string | null;
};

const EXAMPLE = "https://github.com/anthropics/skills/tree/main/document-skills/pdf";

export function PreflightScanner() {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim() || pending) return;

    setPending(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "The scan could not be completed.");
      } else {
        setResult(data as ScanResponse);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const passed = result?.decision === "passed";

  return (
    <div className="space-y-10">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/tree/main/path-to-skill"
            aria-label="GitHub URL of a directory containing SKILL.md"
            className="flex-1 font-mono text-[13px]"
            spellCheck={false}
          />
          <Button type="submit" size="lg" disabled={pending || !url.trim()}>
            {pending ? (
              <>
                <CircleNotch className="size-4 animate-spin" />
                Scanning
              </>
            ) : (
              <>
                Run preflight
                <ArrowRight weight="bold" className="size-4" />
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Any public GitHub skill — yours or someone else&apos;s. Nothing is
          stored and the skill is never executed.{" "}
          <button
            type="button"
            onClick={() => setUrl(EXAMPLE)}
            className="font-medium text-accent hover:underline"
          >
            Use an example
          </button>
        </p>
      </form>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-red-50/60 px-4 py-3.5">
          <WarningCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm leading-relaxed text-foreground">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-10">
          <section
            className={cn(
              "rounded-xl border p-6",
              passed
                ? "border-accent/25 bg-accent-soft/40"
                : "border-destructive/25 bg-red-50/50",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Preflight result
                </p>
                <h2
                  className={cn(
                    "mt-2 flex items-center gap-2.5 text-2xl font-semibold tracking-tight",
                    passed ? "text-accent" : "text-destructive",
                  )}
                >
                  {passed ? (
                    <ShieldCheck weight="fill" className="size-6" />
                  ) : (
                    <Warning weight="fill" className="size-6" />
                  )}
                  {passed ? "No findings in this subset" : "Findings to resolve"}
                </h2>
                <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {result.summary}
                </p>
              </div>
              <SeverityCountsRow
                counts={result.counts}
                emphasiseZero
                className="text-xs"
              />
            </div>

            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Target</dt>
                <dd className="mt-0.5 truncate font-mono text-xs">
                  {result.target.owner}/{result.target.repo}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Path</dt>
                <dd className="mt-0.5 truncate font-mono text-xs">
                  {result.target.path}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Duration</dt>
                <dd className="mt-0.5 font-mono text-xs">
                  {result.provenance.durationMs} ms
                </dd>
              </div>
            </dl>

            {result.registrySlug && (
              <Link
                href={`/skills/${result.registrySlug}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                This skill is already in the registry — view its full trust report
                <ArrowRight weight="bold" className="size-3.5" />
              </Link>
            )}
          </section>

          {result.findings.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold tracking-tight">
                Findings
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Each finding names the rule that produced it. Follow the rule to
                see what it checks and how to resolve it.
              </p>
              <FindingsTable className="mt-5" findings={result.findings} />
            </section>
          )}

          <section>
            <h3 className="text-lg font-semibold tracking-tight">
              Coverage of this run
            </h3>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The browser preflight reads one Markdown file, so it can only decide
              rules that are visible in that text. Everything below marked not
              assessed needs the full skill directory — run the CLI or publish to
              the registry for those gates.
            </p>
            <GateMatrix
              className="mt-5"
              gates={[
                {
                  name: "Structure",
                  state: "partial",
                  detail:
                    "Front-matter fields and skill name are checked. The complete specification ruleset runs in the CLI.",
                },
                {
                  name: "Secrets and dangerous instructions",
                  state: (result.counts.total > 0
                    ? "findings"
                    : "passed") as GateState,
                  detail:
                    "Credential patterns and destructive, remote-pipe, dynamic-execution and shell-helper instructions in SKILL.md.",
                },
                {
                  name: "Complete-package risk",
                  state: "partial",
                  detail:
                    "Injection language, payload decoding, persistence, exfiltration and privilege changes are checked in text. Archives, links, manifests and adjacent scripts are not.",
                },
                {
                  name: "Privacy and behaviour",
                  state: "not-assessed",
                  detail:
                    "PII entities and red-team behaviour under attack are not evaluated in the browser.",
                },
              ]}
            />
            <ul className="mt-5 flex flex-wrap gap-2">
              {result.notAssessed.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-dashed border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-muted/30 p-5">
            <h3 className="text-sm font-semibold">Provenance</h3>
            <dl className="mt-4 grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
              {[
                ["Engine", result.provenance.scanner],
                ["Policy profile", result.provenance.policyProfile],
                ["Policy hash", result.provenance.policyHash],
                [
                  "Input size",
                  `${result.provenance.bytes} bytes${result.provenance.truncated ? " (truncated at 1 MiB)" : ""}`,
                ],
                ["Deterministic", String(result.provenance.deterministic)],
                ["Skill executed", String(result.provenance.executed)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="truncate font-mono text-xs">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
