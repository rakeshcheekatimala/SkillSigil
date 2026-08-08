import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listSkills } from "@/lib/skills";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const mine = await listSkills({
    ownerUserId: session.id,
    visibility: "all",
    sort: "newest",
    limit: 100,
  });

  return NextResponse.json({
    skills: mine,
    drafts: mine.filter((s) => s.visibility === "draft"),
    listed: mine.filter((s) => s.visibility === "public"),
  });
}
