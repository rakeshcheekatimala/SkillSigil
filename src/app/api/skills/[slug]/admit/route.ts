import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { recordSkillEvent } from "@/lib/events";
import { rateLimit } from "@/lib/rate-limit";
import { canAdmit, getSkillDetail } from "@/lib/skills";
import { issueSigil } from "@/lib/trust/sigil";

/**
 * Promote a draft to the public catalog and issue a registry sigil.
 *
 * Admission requires a passing scan. Findings are not "waived" here — the
 * publisher remediates and rescans first. That is the gate, not a soft nudge.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { slug } = await context.params;
  const limited = await rateLimit(`admit:${session.id}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const detail = await getSkillDetail(slug, session.id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (detail.ownerUserId !== session.id) {
    return NextResponse.json(
      { error: "Only the publisher can admit this skill", code: "FORBIDDEN" },
      { status: 403 },
    );
  }
  if (!canAdmit(detail.status)) {
    return NextResponse.json(
      {
        error:
          "Admission requires a passing scan. Resolve findings, rescan, then admit.",
        code: "NOT_ADMISSIBLE",
        status: detail.status,
        counts: detail.counts,
      },
      { status: 409 },
    );
  }
  if (!detail.scan?.completedAt) {
    return NextResponse.json(
      { error: "No completed scan to certify", code: "NO_SCAN" },
      { status: 409 },
    );
  }

  const sigil = await issueSigil({
    slug: detail.slug,
    name: detail.name,
    repository: `https://github.com/${detail.repo}`,
    commitSha: detail.fullCommitSha,
    status: detail.status,
    policyHash: detail.scan.policyHash,
    toolVersion: detail.scan.toolVersion,
    scanId: detail.scan.id,
    completedAt: detail.scan.completedAt,
    durationMs: detail.scan.durationMs,
    findings: detail.findings,
    counts: detail.counts,
  });

  const db = getDb();
  const wasDraft = detail.visibility === "draft";
  await db
    .update(skills)
    .set({
      visibility: "public",
      updatedAt: new Date(),
    })
    .where(eq(skills.id, detail.id));

  await recordSkillEvent({
    skillId: detail.id,
    kind: "admitted",
    fromStatus: detail.status,
    toStatus: detail.status,
    toCommitSha: detail.fullCommitSha,
    scanId: detail.scan.id,
    detail: {
      digestUri: sigil.digestUri,
      digest: sigil.digest,
      shortDigest: sigil.shortDigest,
      signature: sigil.signature,
      signedAt: sigil.signedAt,
      signer: sigil.signer,
      fromVisibility: detail.visibility,
      toVisibility: "public",
    },
  });

  if (wasDraft) {
    await recordSkillEvent({
      skillId: detail.id,
      kind: "visibility_changed",
      detail: { from: "draft", to: "public" },
    });
  }

  const origin = process.env.APP_URL || new URL(request.url).origin;

  return NextResponse.json({
    ok: true,
    slug: detail.slug,
    visibility: "public",
    sigil: {
      digestUri: sigil.digestUri,
      shortDigest: sigil.shortDigest,
      signature: sigil.signature,
      signedAt: sigil.signedAt,
      signer: sigil.signer,
      badgeMarkdown: sigil.badgeMarkdown(origin, detail.slug),
      verifyCommand: sigil.verifyCommand(origin, detail.slug),
      certificateUrl: `${origin}/cert/${detail.slug}`,
    },
  });
}
