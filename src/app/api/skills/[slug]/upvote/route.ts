import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getSkillRowBySlug } from "@/lib/skills";
import { hasUpvoted, removeUpvote, upvoteSkill } from "@/lib/upvotes";

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

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = await rateLimit(`upvote:${session.id}:${ip}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { slug } = await context.params;
  const skill = await getSkillRowBySlug(slug);
  if (!skill || skill.visibility !== "public") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await upvoteSkill(session.id, skill.id);
  return NextResponse.json(result);
}

export async function DELETE(
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
  const skill = await getSkillRowBySlug(slug);
  if (!skill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await removeUpvote(session.id, skill.id);
  return NextResponse.json(result);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  const { slug } = await context.params;
  const skill = await getSkillRowBySlug(slug);
  if (!skill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!session) {
    return NextResponse.json({ upvoted: false, count: skill.upvoteCount });
  }
  const upvoted = await hasUpvoted(session.id, skill.id);
  return NextResponse.json({ upvoted, count: skill.upvoteCount });
}
