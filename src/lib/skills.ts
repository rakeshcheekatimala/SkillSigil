import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { scans, skills, users, type ScanRow, type SkillRow } from "@/db/schema";
import type { ScanStatus } from "@/data/skills";
import {
  countSeverities,
  EMPTY_COUNTS,
  findingsSummaryText,
  normaliseFindings,
  type NormalisedFinding,
  type SeverityCounts,
} from "@/lib/trust/decision";

export type SkillView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: { username: string; avatarUrl: string };
  repo: string;
  commitSha: string;
  status: ScanStatus;
  riskScore: number;
  upvoteCount: number;
  downloadCount: number;
  createdAt: string;
  findingsSummary?: string;
  counts: SeverityCounts;
};

/** Everything a trust report or certificate needs, in one shape. */
export type SkillDetail = SkillView & {
  fullCommitSha: string;
  subpath: string;
  findings: NormalisedFinding[];
  scan: {
    id: string | null;
    toolVersion: string | null;
    policyHash: string | null;
    durationMs: number | null;
    completedAt: Date | null;
    error: string | null;
  } | null;
};

function mapStatus(status: string): ScanStatus {
  if (status === "passed") return "passed";
  if (status === "failed") return "failed";
  if (status === "flagged") return "flagged";
  if (status === "error") return "error";
  return "pending";
}

export function toSkillView(
  row: SkillRow,
  author: { username: string; avatarUrl: string | null },
  scan?: {
    findings?: unknown;
  } | null,
): SkillView {
  const findings = scan ? normaliseFindings(scan.findings) : [];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags ?? [],
    author: {
      username: author.username,
      avatarUrl:
        author.avatarUrl ?? "https://avatars.githubusercontent.com/u/0?v=4",
    },
    repo: `${row.repoOwner}/${row.repoName}`,
    commitSha: row.commitSha.slice(0, 7) || row.commitSha,
    status: mapStatus(row.status),
    riskScore: row.riskScore,
    upvoteCount: row.upvoteCount,
    downloadCount: row.downloadCount,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    findingsSummary: scan ? findingsSummaryText(scan.findings) : undefined,
    counts: scan ? countSeverities(findings) : { ...EMPTY_COUNTS },
  };
}

export async function listSkills(opts?: {
  q?: string;
  category?: string;
  sort?: "trending" | "newest" | "downloads";
  status?: ScanStatus;
  limit?: number;
}): Promise<SkillView[]> {
  const db = getDb();
  const q = opts?.q?.trim();
  const category = opts?.category;

  const conditions = [];
  if (category && category !== "All") {
    conditions.push(eq(skills.category, category));
  }
  if (opts?.status) {
    conditions.push(eq(skills.status, opts.status));
  }
  if (q) {
    conditions.push(
      sql`${skills.searchVector} @@ plainto_tsquery('english', ${q})`,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  let order;
  if (opts?.sort === "newest") order = desc(skills.createdAt);
  else if (opts?.sort === "downloads") order = desc(skills.downloadCount);
  else order = sql`(${skills.upvoteCount} + ${skills.downloadCount}) DESC`;

  const rows = await db
    .select({
      skill: skills,
      username: users.username,
      avatarUrl: users.avatarUrl,
      findings: scans.findings,
    })
    .from(skills)
    .innerJoin(users, eq(skills.ownerUserId, users.id))
    .leftJoin(scans, eq(scans.id, skills.latestScanId))
    .where(where)
    .orderBy(order)
    .limit(opts?.limit ?? 100);

  return rows.map((r) =>
    toSkillView(
      r.skill,
      { username: r.username, avatarUrl: r.avatarUrl },
      r.findings === null ? null : { findings: r.findings },
    ),
  );
}

async function loadSkillRow(slug: string) {
  const db = getDb();
  const rows = await db
    .select({
      skill: skills,
      username: users.username,
      avatarUrl: users.avatarUrl,
      scan: scans,
    })
    .from(skills)
    .innerJoin(users, eq(skills.ownerUserId, users.id))
    .leftJoin(scans, eq(scans.id, skills.latestScanId))
    .where(eq(skills.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSkillBySlug(slug: string): Promise<SkillView | null> {
  const row = await loadSkillRow(slug);
  if (!row) return null;
  return toSkillView(
    row.skill,
    { username: row.username, avatarUrl: row.avatarUrl },
    row.scan,
  );
}

export async function getSkillDetail(slug: string): Promise<SkillDetail | null> {
  const row = await loadSkillRow(slug);
  if (!row) return null;

  const scan = row.scan as ScanRow | null;
  const view = toSkillView(
    row.skill,
    { username: row.username, avatarUrl: row.avatarUrl },
    scan,
  );

  return {
    ...view,
    fullCommitSha: row.skill.commitSha,
    subpath: row.skill.subpath,
    findings: scan ? normaliseFindings(scan.findings) : [],
    scan: scan
      ? {
          id: scan.id,
          toolVersion: scan.toolVersion,
          policyHash: scan.policyHash,
          durationMs: scan.durationMs,
          completedAt: scan.completedAt,
          error: scan.error,
        }
      : null,
  };
}

export async function getSkillRowBySlug(slug: string) {
  const db = getDb();
  const rows = await db.select().from(skills).where(eq(skills.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
