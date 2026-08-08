import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getSkillBySlug, getSkillRowBySlug } from "@/lib/skills";
import { hasStarred, starSkill, unstarSkill } from "@/lib/stars";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const session = await getSession();
  const skill = await getSkillBySlug(slug, session?.id);
  if (!skill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const starred = session ? await hasStarred(session.id, skill.id) : false;
  return NextResponse.json({
    starred,
    count: skill.starCount,
  });
}

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

  const limited = await rateLimit(`star:${session.id}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { slug } = await context.params;
  const skill = await getSkillBySlug(slug, session.id);
  if (!skill || skill.visibility === "draft") {
    return NextResponse.json(
      { error: "Only public listed skills can be starred", code: "NOT_PUBLIC" },
      { status: 404 },
    );
  }

  const row = await getSkillRowBySlug(slug);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await starSkill(session.id, row.id);
  return NextResponse.json(result);
}

export async function DELETE(
  _request: Request,
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
  const row = await getSkillRowBySlug(slug);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await unstarSkill(session.id, row.id);
  return NextResponse.json(result);
}
