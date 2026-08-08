import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { scans, skills } from "@/db/schema";
import {
  dispatchScanWorkflow,
  fetchSkillMarkdown,
} from "@/lib/github";
import { recordSkillEvent } from "@/lib/events";
import { localStaticScan } from "@/lib/scan/local-static-scan";
import { PREFLIGHT_POLICY_HASH, PREFLIGHT_VERSION } from "@/lib/scan/preflight";
export { signScanPayload, verifyScanSignature } from "@/lib/scan/signature";

export async function queueOrRunScan(input: {
  skillId: string;
  scanId: string;
  owner: string;
  repo: string;
  ref: string;
  subpath: string;
  commitSha: string;
  token?: string | null;
  appUrl: string;
}) {
  const db = getDb();
  await db
    .update(skills)
    .set({ status: "scanning", updatedAt: new Date() })
    .where(eq(skills.id, input.skillId));

  await db
    .update(scans)
    .set({ status: "running" })
    .where(eq(scans.id, input.scanId));

  const callbackUrl = `${input.appUrl.replace(/\/$/, "")}/api/scans/callback`;
  const dispatched = await dispatchScanWorkflow({
    skillId: input.skillId,
    scanId: input.scanId,
    owner: input.owner,
    repo: input.repo,
    ref: input.ref,
    subpath: input.subpath,
    commitSha: input.commitSha,
    callbackUrl,
  });

  if (dispatched.ok) {
    return { mode: "actions" as const };
  }

  // Local fallback so the product works at $0 without Actions secrets.
  let content = "";
  try {
    content = await fetchSkillMarkdown({
      owner: input.owner,
      repo: input.repo,
      ref: input.commitSha || input.ref,
      subpath: input.subpath,
      token: input.token,
    });
  } catch (err) {
    // A fetch failure is an error, not a verdict. Recording it as "failed"
    // would claim rules matched; the scanner contract keeps the two distinct
    // and neither may be read as a pass.
    await completeScan({
      skillId: input.skillId,
      scanId: input.scanId,
      commitSha: input.commitSha,
      status: "error",
      score: 0,
      findings: {
        summary: err instanceof Error ? err.message : "Failed to fetch SKILL.md",
        items: [],
      },
      toolVersion: PREFLIGHT_VERSION,
      policyHash: PREFLIGHT_POLICY_HASH,
      durationMs: 0,
      error: err instanceof Error ? err.message : "fetch failed",
    });
    return { mode: "local" as const, error: String(err) };
  }

  const result = localStaticScan(content);
  await completeScan({
    skillId: input.skillId,
    scanId: input.scanId,
    commitSha: input.commitSha,
    status: result.status === "passed" ? "passed" : "failed",
    score: result.score,
    findings: {
      summary: result.summary,
      items: result.findings,
    },
    toolVersion: result.toolVersion,
    policyHash: result.policyHash,
    durationMs: result.durationMs,
  });

  return { mode: "local" as const };
}

export async function completeScan(input: {
  skillId: string;
  scanId: string;
  commitSha: string;
  status: "passed" | "failed" | "flagged" | "error";
  score: number;
  findings: Record<string, unknown>;
  toolVersion?: string;
  policyHash?: string;
  durationMs?: number;
  error?: string;
}) {
  const db = getDb();
  await db
    .update(scans)
    .set({
      status: input.status,
      score: input.score,
      findings: input.findings,
      toolVersion: input.toolVersion,
      policyHash: input.policyHash,
      durationMs: input.durationMs,
      error: input.error,
      commitSha: input.commitSha,
      completedAt: new Date(),
    })
    .where(eq(scans.id, input.scanId));

  const previous = await db
    .select({ status: skills.status, commitSha: skills.commitSha })
    .from(skills)
    .where(eq(skills.id, input.skillId))
    .limit(1);

  await db
    .update(skills)
    .set({
      status: input.status,
      riskScore: input.score,
      latestScanId: input.scanId,
      commitSha: input.commitSha,
      upstreamSha: input.commitSha,
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(skills.id, input.skillId));

  const fromStatus = previous[0]?.status;
  await recordSkillEvent({
    skillId: input.skillId,
    kind: "scan_completed",
    fromStatus: fromStatus ?? null,
    toStatus: input.status,
    fromCommitSha: previous[0]?.commitSha ?? null,
    toCommitSha: input.commitSha,
    scanId: input.scanId,
    detail: { score: input.score },
  });

  if (
    fromStatus === "passed" &&
    (input.status === "failed" || input.status === "flagged")
  ) {
    await db
      .update(skills)
      .set({ regressedAt: new Date() })
      .where(eq(skills.id, input.skillId));
    await recordSkillEvent({
      skillId: input.skillId,
      kind: "regressed",
      fromStatus,
      toStatus: input.status,
      fromCommitSha: previous[0]?.commitSha ?? null,
      toCommitSha: input.commitSha,
      scanId: input.scanId,
    });
  }
}
