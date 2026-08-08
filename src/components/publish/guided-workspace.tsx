"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  CircleNotch,
  SealCheck,
  Warning,
} from "@phosphor-icons/react";
import { FindingsTable } from "@/components/trust/findings-table";
import { GateMatrix } from "@/components/trust/gate-matrix";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { SeverityCountsRow } from "@/components/ui/severity-counts";
import { TrustBadge } from "@/components/ui/trust-badge";
import type { ScanStatus } from "@/data/skills";
import type { NormalisedFinding, SeverityCounts } from "@/lib/trust/decision";
import { cn } from "@/lib/utils";

export type GuidedSkill = {
  slug: string;
  name: string;
  status: ScanStatus;
  visibility: "draft" | "public";
  counts: SeverityCounts;
  findings: NormalisedFinding[];
  findingsSummary?: string;
  commitSha: string;
  repo: string;
  admission: {
    digestUri: string | null;
    signature: string | null;
    signedAt: string | null;
  } | null;
};

type SigilResult = {
  digestUri: string;
  shortDigest: string;
  signature: string;
  signedAt: string;
  badgeMarkdown: string;
  verifyCommand: string;
  certificateUrl: string;
};

const STEPS = [
  "Submit source",
  "Scan",
  "Review findings",
  "Remediate + rescan",
  "Admit + issue sigil",
] as const;

function stepIndex(skill: GuidedSkill, admitted: boolean): number {
  if (admitted || skill.visibility === "public") return 4;
  if (skill.status === "pending") return 1;
  if (skill.status === "passed") return 4;
  if (skill.findings.length > 0 || skill.status === "failed") return 3;
  return 2;
}

export function GuidedWorkspace({ skill }: { skill: GuidedSkill }) {
  const [status] = useState(skill.status);
  const [visibility, setVisibility] = useState(skill.visibility);
  const [counts] = useState(skill.counts);
  const [findings] = useState(skill.findings);
  const [summary] = useState(skill.findingsSummary);
  const [commitSha] = useState(skill.commitSha);
  const [pending, setPending] = useState<"rescan" | "admit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sigil, setSigil] = useState<SigilResult | null>(
    skill.admission?.digestUri
      ? {
          digestUri: skill.admission.digestUri,
          shortDigest: skill.admission.digestUri.slice(-12),
          signature: skill.admission.signature ?? "",
          signedAt: skill.admission.signedAt ?? "",
          badgeMarkdown: "",
          verifyCommand: "",
          certificateUrl: `/cert/${skill.slug}`,
        }
      : null,
  );

  const admitted = Boolean(sigil || skill.admission);
  const active = stepIndex(
    { ...skill, status, visibility, findings, counts },
    admitted,
  );
  const canAdmit = status === "passed" && !admitted;

  async function rescan() {
    setPending("rescan");
    setError(null);
    try {
      const res = await fetch(`/api/skills/${skill.slug}/rescan`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rescan failed");
      // Reload so findings and counts stay authoritative.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rescan failed");
      setPending(null);
    }
  }

  async function admit() {
    setPending("admit");
    setError(null);
    try {
      const res = await fetch(`/api/skills/${skill.slug}/admit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Admission failed");
      setVisibility("public");
      setSigil(data.sigil as SigilResult);
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admission failed");
      setPending(null);
    }
  }

  return (
    <div className="space-y-10">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              index < active && "border-accent/30 bg-accent-soft text-accent",
              index === active && "border-primary bg-primary text-primary-foreground",
              index > active && "border-border text-muted-foreground",
            )}
          >
            <span className="font-mono opacity-70">{index + 1}.</span> {label}
          </li>
        ))}
      </ol>

      <section
        className={cn(
          "rounded-xl border p-6",
          status === "passed"
            ? "border-accent/25 bg-accent-soft/40"
            : status === "failed" || status === "flagged"
              ? "border-destructive/25 bg-red-50/50"
              : "border-border bg-muted/30",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {visibility === "draft" ? "Private draft" : "Listed skill"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {skill.name}
            </h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {skill.repo}@{commitSha}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {summary ??
                (status === "pending"
                  ? "Scan in progress. This draft is invisible to everyone else."
                  : "Review the decision below.")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <TrustBadge status={status} showCode />
            <SeverityCountsRow counts={counts} emphasiseZero />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {(status === "failed" || status === "flagged" || status === "error") && (
            <Button
              type="button"
              onClick={rescan}
              disabled={pending !== null}
            >
              {pending === "rescan" ? (
                <CircleNotch className="size-4 animate-spin" />
              ) : (
                <ArrowRight weight="bold" className="size-4" />
              )}
              Rescan after fixes
            </Button>
          )}
          {canAdmit && (
            <Button
              type="button"
              variant="accent"
              onClick={admit}
              disabled={pending !== null}
            >
              {pending === "admit" ? (
                <CircleNotch className="size-4 animate-spin" />
              ) : (
                <SealCheck weight="fill" className="size-4" />
              )}
              Admit and issue sigil
            </Button>
          )}
          {status === "passed" && visibility === "public" && (
            <Link
              href={`/skills/${skill.slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
            >
              View public listing
              <ArrowRight className="size-3.5" />
            </Link>
          )}
          {status === "pending" && (
            <Button type="button" variant="outline" onClick={rescan} disabled>
              <CircleNotch className="size-4 animate-spin" />
              Scanning…
            </Button>
          )}
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 text-sm text-destructive">
            <Warning className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
      </section>

      {findings.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">
            Findings to remediate
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Fix these in the source repo, push, then rescan. Admission stays
            locked until the scan passes.
          </p>
          <FindingsTable className="mt-5" findings={findings} />
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Admission gates</h2>
        <GateMatrix
          className="mt-4"
          gates={[
            {
              name: "Structure + security preflight",
              state:
                status === "passed"
                  ? "passed"
                  : status === "pending"
                    ? "not-assessed"
                    : "findings",
              detail:
                status === "passed"
                  ? "No findings under the configured policy for this commit."
                  : "Resolve every finding before the skill can be listed.",
            },
            {
              name: "Publisher admission",
              state: visibility === "public" ? "passed" : "not-assessed",
              detail:
                visibility === "public"
                  ? "You admitted this skill and a sigil was issued."
                  : "Explicit action. A passing scan alone does not list the skill.",
            },
            {
              name: "Behaviour under attack",
              state: "not-assessed",
              detail:
                "Red-team testing is not run by the registry. Use skilltrustops locally if you need it.",
            },
          ]}
        />
      </section>

      {(sigil || skill.admission) && (
        <section className="rounded-xl border border-accent/25 bg-accent-soft/30 p-6">
          <div className="flex items-center gap-2">
            <CheckCircle weight="fill" className="size-5 text-accent" />
            <h2 className="text-lg font-semibold tracking-tight">
              Sigil issued
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Content-addressed certificate with a registry HMAC. Anyone can
            recompute the digest from the published bytes; the signature proves
            SkillSigil admitted this exact decision.
          </p>
          <div className="mt-5 space-y-3">
            {sigil?.digestUri && (
              <CopyField label="Digest" value={sigil.digestUri} />
            )}
            {sigil?.signature && (
              <CopyField label="Registry signature" value={sigil.signature} />
            )}
            {sigil?.badgeMarkdown ? (
              <CopyField label="README badge" value={sigil.badgeMarkdown} />
            ) : (
              <CopyField
                label="README badge"
                value={`[![SkillSigil](/api/badge/${skill.slug})](/cert/${skill.slug})`}
              />
            )}
            {sigil?.verifyCommand && (
              <CopyField label="Verify locally" value={sigil.verifyCommand} />
            )}
          </div>
          <Link
            href={`/cert/${skill.slug}`}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            Open certificate page
            <ArrowRight className="size-3.5" />
          </Link>
        </section>
      )}
    </div>
  );
}
