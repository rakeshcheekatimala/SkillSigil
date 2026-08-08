import { NextResponse } from "next/server";
import { issueCertificate } from "@/lib/trust/certificate";
import { getSkillDetail } from "@/lib/skills";

/**
 * Publishes the canonical certificate bytes verbatim.
 *
 * The body is the exact string the digest is computed over, with no trailing
 * newline, so `curl -s … | shasum -a 256` reproduces the published digest. Do
 * not use NextResponse.json() here — re-serialising would change the bytes and
 * silently break every verification.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const skill = await getSkillDetail(slug);

  if (!skill || skill.visibility !== "public") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!skill.scan?.completedAt) {
    return NextResponse.json(
      {
        error:
          "No completed scan for this skill, so there is no certificate. An unfinished scan is not a pass.",
        code: "NO_COMPLETED_SCAN",
        status: skill.status,
      },
      { status: 409 },
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

  return new Response(certificate.canonical, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-SkillSigil-Digest": certificate.digestUri,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
