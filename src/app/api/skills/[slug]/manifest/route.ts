import { NextResponse } from "next/server";
import { getSkillBySlug } from "@/lib/skills";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const skill = await getSkillBySlug(slug);
  if (!skill || skill.visibility !== "public") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    name: skill.name,
    slug: skill.slug,
    version: skill.commitSha,
    description: skill.description,
    repository: `https://github.com/${skill.repo}`,
    download_url: `${origin}/api/skills/${skill.slug}/install`,
    trust: {
      status: skill.status,
      score: skill.riskScore,
      scanner: "skilltrustops",
      policy: "recommended-v2",
    },
  });
}
