import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { scans, skills, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { recordSkillEvent } from "@/lib/events";
import { resolveCommitSha } from "@/lib/github";
import { rateLimit } from "@/lib/rate-limit";
import { queueOrRunScan } from "@/lib/scan/pipeline";
import { getSkillRowBySlug } from "@/lib/skills";

/**
 * Re-run the scan against the current upstream commit.
 * Used by the guided publish flow after the publisher remediates findings.
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
  const limited = await rateLimit(`rescan:${session.id}`, {
    limit: 15,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const skill = await getSkillRowBySlug(slug);
  if (!skill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (skill.visibility === "draft" && skill.ownerUserId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (skill.ownerUserId !== session.id) {
    return NextResponse.json(
      { error: "Only the publisher can rescan this skill", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const db = getDb();
  const ownerRows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);
  const owner = ownerRows[0];

  let commitSha = skill.commitSha;
  try {
    commitSha = await resolveCommitSha(
      skill.repoOwner,
      skill.repoName,
      skill.ref,
      owner?.accessToken,
    );
  } catch {
    // Keep the previous sha; the scan fetch will surface a clean error.
  }

  const previousStatus = skill.status;
  const previousSha = skill.commitSha;

  const [scan] = await db
    .insert(scans)
    .values({
      skillId: skill.id,
      commitSha,
      status: "queued",
    })
    .returning();

  await db
    .update(skills)
    .set({
      commitSha,
      upstreamSha: commitSha,
      status: "pending_scan",
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(skills.id, skill.id));

  await recordSkillEvent({
    skillId: skill.id,
    kind: "rescan",
    fromStatus: previousStatus,
    toStatus: "pending_scan",
    fromCommitSha: previousSha,
    toCommitSha: commitSha,
    scanId: scan.id,
  });

  const appUrl = process.env.APP_URL || new URL(request.url).origin;
  const scanResult = await queueOrRunScan({
    skillId: skill.id,
    scanId: scan.id,
    owner: skill.repoOwner,
    repo: skill.repoName,
    ref: skill.ref,
    subpath: skill.subpath,
    commitSha,
    token: owner?.accessToken,
    appUrl,
  });

  const refreshed = await db
    .select()
    .from(skills)
    .where(eq(skills.id, skill.id))
    .limit(1);

  return NextResponse.json({
    ok: true,
    slug: skill.slug,
    status: refreshed[0]?.status ?? "pending_scan",
    commitSha: (refreshed[0]?.commitSha ?? commitSha).slice(0, 7),
    scanMode: scanResult.mode,
  });
}
