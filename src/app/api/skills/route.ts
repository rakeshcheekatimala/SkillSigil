import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { scans, skills, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import {
  fetchRepoPermission,
  parseGithubSkillUrl,
  resolveCommitSha,
} from "@/lib/github";
import { rateLimit } from "@/lib/rate-limit";
import { queueOrRunScan } from "@/lib/scan/pipeline";
import { listSkills, slugify } from "@/lib/skills";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const sortParam = searchParams.get("sort");
  const sort =
    sortParam === "newest" || sortParam === "downloads" || sortParam === "trending"
      ? sortParam
      : "trending";

  const list = await listSkills({ q, category, sort });
  return NextResponse.json({ skills: list });
}

const publishSchema = z.object({
  source: z.enum(["github", "upload"]),
  githubUrl: z.string().url().optional(),
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in with GitHub to publish", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = await rateLimit(`publish:${session.id}:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = publishSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (body.data.source !== "github" || !body.data.githubUrl) {
    return NextResponse.json(
      { error: "GitHub URL publish is required in this build; zip upload stores to R2 next." },
      { status: 400 },
    );
  }

  const parsed = parseGithubSkillUrl(body.data.githubUrl);
  if (!parsed) {
    return NextResponse.json(
      { error: "Provide a valid GitHub URL" },
      { status: 400 },
    );
  }

  const db = getDb();
  const ownerRows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);
  const owner = ownerRows[0];
  if (!owner) {
    return NextResponse.json({ error: "User missing" }, { status: 400 });
  }

  // Demo users skip GitHub permission check; real OAuth users are verified.
  if (owner.accessToken) {
    const perm = await fetchRepoPermission(
      owner.accessToken,
      parsed.owner,
      parsed.repo,
    );
    if (perm !== "admin" && perm !== "push") {
      return NextResponse.json(
        { error: "You need push access to that repository" },
        { status: 403 },
      );
    }
  }

  let commitSha = "";
  try {
    commitSha = await resolveCommitSha(
      parsed.owner,
      parsed.repo,
      parsed.ref,
      owner.accessToken,
    );
  } catch {
    // Public resolve may fail for private/missing repos in demo — keep empty and fail scan cleanly.
    commitSha = parsed.ref;
  }

  const baseSlug = slugify(
    body.data.name || parsed.subpath.split("/").filter(Boolean).pop() || parsed.repo,
  );
  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const clash = await db.select().from(skills).where(eq(skills.slug, slug)).limit(1);
    if (!clash[0]) break;
    slug = `${baseSlug}-${i + 2}`;
  }

  const [skill] = await db
    .insert(skills)
    .values({
      slug,
      name: body.data.name || slug,
      description:
        body.data.description ||
        `Skill imported from ${parsed.owner}/${parsed.repo}`,
      ownerUserId: session.id,
      repoOwner: parsed.owner,
      repoName: parsed.repo,
      ref: parsed.ref,
      subpath: parsed.subpath,
      commitSha,
      category: body.data.category || "Productivity",
      tags: [],
      status: "pending_scan",
    })
    .returning();

  const [scan] = await db
    .insert(scans)
    .values({
      skillId: skill.id,
      commitSha,
      status: "queued",
    })
    .returning();

  const appUrl = process.env.APP_URL || new URL(request.url).origin;
  const scanResult = await queueOrRunScan({
    skillId: skill.id,
    scanId: scan.id,
    owner: parsed.owner,
    repo: parsed.repo,
    ref: parsed.ref,
    subpath: parsed.subpath,
    commitSha,
    token: owner.accessToken,
    appUrl,
  });

  const refreshed = await db
    .select()
    .from(skills)
    .where(eq(skills.id, skill.id))
    .limit(1);

  return NextResponse.json(
    {
      ok: true,
      slug: skill.slug,
      status: refreshed[0]?.status ?? "pending_scan",
      riskScore: refreshed[0]?.riskScore ?? 0,
      scanMode: scanResult.mode,
      publisher: session.username,
    },
    { status: 202 },
  );
}
