import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { FindingsTable } from "@/components/trust/findings-table";
import { CopyField } from "@/components/ui/copy-field";
import { SeverityCountsRow } from "@/components/ui/severity-counts";
import { TrustBadge } from "@/components/ui/trust-badge";
import { issueCertificate, verifyCommand } from "@/lib/trust/certificate";
import { badgeSnippet } from "@/lib/trust/sigil";
import { getSkillDetail } from "@/lib/skills";
import { decisionFor } from "@/lib/trust/decision";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkillDetail(slug);
  if (!skill) return { title: "Certificate not found" };
  return {
    title: `Certificate · ${skill.name}`,
    description: `Trust certificate for ${skill.name} at ${skill.commitSha}.`,
  };
}

export default async function CertificatePage({ params }: PageProps) {
  const { slug } = await params;
  const skill = await getSkillDetail(slug);
  if (!skill || skill.visibility !== "public") notFound();

  if (!skill.scan?.completedAt) {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-16 sm:px-8">
        <h1 className="text-2xl font-semibold">No certificate yet</h1>
        <p className="mt-3 text-muted-foreground">
          This skill has not completed a scan, so there is nothing to verify.
        </p>
      </div>
    );
  }

  const certificate = await issueCertificate({
    slug: skill.slug,
    name: skill.name,
    repository: `https://github.com/${skill.repo}`,
    commitSha: skill.fullCommitSha,
    status: skill.status,
    policyHash: skill.scan.policyHash,
    toolVersion: skill.scan.toolVersion,
    scanId: skill.scan.id,
    completedAt: skill.scan.completedAt,
    durationMs: skill.scan.durationMs,
    findings: skill.findings,
    counts: skill.counts,
  });

  const origin =
    process.env.APP_URL?.replace(/\/$/, "") || "https://skillsigil.dev";
  const decision = decisionFor(skill.status);

  return (
    <article className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href={`/skills/${skill.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to {skill.name}
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_320px] lg:gap-16">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
            Trust certificate
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {skill.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <TrustBadge status={skill.status} showCode />
            <SeverityCountsRow counts={skill.counts} emphasiseZero />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {decision.meaning}
          </p>

          <section className="mt-10 space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Digest</h2>
            <p className="text-sm text-muted-foreground">
              SHA-256 over the canonical certificate JSON. Recompute it yourself
              — if the hashes match, the record has not been altered.
            </p>
            <CopyField value={certificate.digestUri} />
            <CopyField
              label="Verify"
              value={verifyCommand(origin, skill.slug)}
            />
          </section>

          {skill.admission?.signature && (
            <section className="mt-10 space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Registry attestation
              </h2>
              <p className="text-sm text-muted-foreground">
                HMAC issued when SkillSigil admitted this skill. Proves registry
                issuance of this digest at the stated time — not publisher
                identity.
              </p>
              <CopyField
                label="Signature"
                value={skill.admission.signature}
              />
              {skill.admission.signedAt && (
                <p className="font-mono text-xs text-muted-foreground">
                  signed_at {skill.admission.signedAt}
                </p>
              )}
            </section>
          )}

          {skill.findings.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold tracking-tight">Findings</h2>
              <FindingsTable className="mt-4" findings={skill.findings} />
            </section>
          )}

          <section className="mt-10 space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Embed this decision
            </h2>
            <CopyField
              label="README badge"
              value={badgeSnippet(origin, skill.slug)}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/badge/${skill.slug}`}
              alt={`SkillSigil status for ${skill.name}`}
              className="mt-2"
            />
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold">Subject</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Repository</dt>
                <dd className="truncate font-mono text-xs">{skill.repo}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Commit</dt>
                <dd className="font-mono text-xs">{skill.commitSha}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Policy</dt>
                <dd className="font-mono text-xs">
                  {skill.scan.policyHash ?? "recommended-v2"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Scanner</dt>
                <dd className="font-mono text-xs">
                  {skill.scan.toolVersion ?? "skilltrustops"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold">Machine-readable</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Canonical JSON — the exact bytes the digest covers.
            </p>
            <a
              href={`/api/cert/${skill.slug}`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              /api/cert/{skill.slug}
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>

          <div className="rounded-xl border border-dashed border-border p-5">
            <h2 className="text-sm font-semibold">Methodology</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              A pass is scoped evidence, not a safety guarantee. Read what the
              scan does and does not prove.
            </p>
            <Link
              href="/methodology"
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              How scanning works
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
