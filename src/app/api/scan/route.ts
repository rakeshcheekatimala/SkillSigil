import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { fetchSkillMarkdown, parseGithubSkillUrl } from "@/lib/github";
import { rateLimit } from "@/lib/rate-limit";
import {
  MAX_INPUT_BYTES,
  preflightSummary,
  runPreflight,
} from "@/lib/scan/preflight";
import { POLICY } from "@/lib/trust/rules";

/**
 * Public preflight scan. No account, no persistence: the result is computed and
 * returned, and nothing about the submitted skill is stored. Publishing is what
 * creates a record.
 */

const bodySchema = z.object({
  url: z.string().min(1).max(400),
});

const NOT_ASSESSED = [
  "Archives, symlinks and special filesystem entries",
  "Dependency manifests and install lifecycle hooks",
  "Adjacent scripts referenced by SKILL.md",
  "Privacy / PII entities",
  "Model behaviour under adversarial input",
];

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = await rateLimit(`scan:${ip}`, {
    limit: 20,
    windowMs: 5 * 60_000,
  });
  if (!limited.success) {
    return NextResponse.json(
      {
        error:
          "Rate limit reached. The scanner is free — install skilltrustops locally for unlimited runs.",
        code: "RATE_LIMITED",
      },
      { status: 429 },
    );
  }

  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Provide a GitHub URL to scan.", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const target = parseGithubSkillUrl(parsedBody.data.url);
  if (!target) {
    return NextResponse.json(
      {
        error:
          "That is not a GitHub URL. Paste a link to a directory containing SKILL.md.",
        code: "INVALID_URL",
      },
      { status: 400 },
    );
  }

  let content: string;
  try {
    content = await fetchSkillMarkdown({
      owner: target.owner,
      repo: target.repo,
      ref: target.ref,
      subpath: target.subpath,
      token: process.env.GITHUB_TOKEN ?? null,
    });
  } catch {
    const path = [target.subpath, "SKILL.md"].filter(Boolean).join("/");
    return NextResponse.json(
      {
        error: `No SKILL.md found at ${target.owner}/${target.repo}@${target.ref}/${path}. Link the directory that contains SKILL.md.`,
        code: "SKILL_NOT_FOUND",
      },
      { status: 404 },
    );
  }

  const result = runPreflight(content);

  let registrySlug: string | null = null;
  try {
    const db = getDb();
    const existing = await db
      .select({ slug: skills.slug })
      .from(skills)
      .where(
        and(
          eq(skills.repoOwner, target.owner),
          eq(skills.repoName, target.repo),
          eq(skills.subpath, target.subpath),
        ),
      )
      .limit(1);
    registrySlug = existing[0]?.slug ?? null;
  } catch {
    registrySlug = null;
  }

  return NextResponse.json({
    ok: true,
    target: {
      owner: target.owner,
      repo: target.repo,
      ref: target.ref,
      subpath: target.subpath,
      path: [target.subpath, "SKILL.md"].filter(Boolean).join("/"),
    },
    decision: result.status,
    summary: preflightSummary(result),
    counts: result.counts,
    findings: result.findings,
    provenance: {
      scanner: result.toolVersion,
      policyProfile: POLICY.profile,
      policyHash: result.policyHash,
      durationMs: result.durationMs,
      bytes: result.bytes,
      truncated: result.truncated,
      maxBytes: MAX_INPUT_BYTES,
      deterministic: true,
      executed: false,
    },
    notAssessed: NOT_ASSESSED,
    registrySlug,
  });
}
