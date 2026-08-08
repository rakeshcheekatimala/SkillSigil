import { NextResponse } from "next/server";
import { z } from "zod";
import { completeScan, verifyScanSignature } from "@/lib/scan/pipeline";

const schema = z.object({
  skill_id: z.string().uuid(),
  scan_id: z.string().uuid(),
  commit_sha: z.string().min(7),
  status: z.enum(["passed", "failed", "flagged"]),
  score: z.number().int().min(0).max(100),
  findings: z.record(z.string(), z.unknown()).default({}),
  tool_version: z.string().optional(),
  policy_hash: z.string().optional(),
  duration_ms: z.number().int().optional(),
  error: z.string().optional(),
});

export async function POST(request: Request) {
  const secret = process.env.SCAN_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SCAN_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  const raw = await request.text();
  const signature = request.headers.get("x-skillsigil-signature");
  if (!(await verifyScanSignature(raw, signature, secret))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await completeScan({
    skillId: parsed.data.skill_id,
    scanId: parsed.data.scan_id,
    commitSha: parsed.data.commit_sha,
    status: parsed.data.status,
    score: parsed.data.score,
    findings: parsed.data.findings,
    toolVersion: parsed.data.tool_version,
    policyHash: parsed.data.policy_hash,
    durationMs: parsed.data.duration_ms,
    error: parsed.data.error,
  });

  return NextResponse.json({ ok: true });
}
