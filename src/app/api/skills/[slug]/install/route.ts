import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { getSession } from "@/lib/auth";
import { getSkillRowBySlug } from "@/lib/skills";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const skill = await getSkillRowBySlug(slug);
  if (!skill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getSession();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const db = getDb();

  if (session?.id) {
    await db.execute(sql`
      INSERT INTO download_events (skill_id, user_id, ip_hash)
      VALUES (${skill.id}::uuid, ${session.id}::uuid, ${ip})
    `);
  } else {
    await db.execute(sql`
      INSERT INTO download_events (skill_id, ip_hash)
      VALUES (${skill.id}::uuid, ${ip})
    `);
  }
  await db.execute(sql`
    UPDATE skills
    SET download_count = download_count + 1, updated_at = now()
    WHERE id = ${skill.id}::uuid
  `);

  const ref = skill.commitSha || skill.ref || "main";
  const path = skill.subpath
    ? `${skill.repoOwner}/${skill.repoName}/tree/${ref}/${skill.subpath}`
    : `${skill.repoOwner}/${skill.repoName}/archive/${ref}.zip`;

  if (skill.subpath) {
    return NextResponse.redirect(`https://github.com/${path}`, 302);
  }
  return NextResponse.redirect(`https://github.com/${path}`, 302);
}
