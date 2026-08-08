import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { scans, skills, stars, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { toSkillView } from "@/lib/skills";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const db = getDb();
  const rows = await db
    .select({
      skill: skills,
      username: users.username,
      avatarUrl: users.avatarUrl,
      findings: scans.findings,
      starredAt: stars.createdAt,
    })
    .from(stars)
    .innerJoin(skills, eq(stars.skillId, skills.id))
    .innerJoin(users, eq(skills.ownerUserId, users.id))
    .leftJoin(scans, eq(scans.id, skills.latestScanId))
    .where(eq(stars.userId, session.id))
    .orderBy(desc(stars.createdAt))
    .limit(100);

  return NextResponse.json({
    skills: rows
      .filter((r) => r.skill.visibility === "public")
      .map((r) => ({
        ...toSkillView(
          r.skill,
          { username: r.username, avatarUrl: r.avatarUrl },
          r.findings === null ? null : { findings: r.findings },
        ),
        starredAt: r.starredAt.toISOString(),
      })),
  });
}
