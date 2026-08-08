import type { Metadata } from "next";
import { SkillsCatalog } from "@/components/skills/skills-catalog";
import { listSkills } from "@/lib/skills";
import { CATEGORIES } from "@/data/skills";

export const metadata: Metadata = {
  title: "Explore skills",
  description: "Search, trending, and categories across trusted agentic skills.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ sort?: string; q?: string; category?: string }>;
};

export default async function SkillsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort =
    params.sort === "newest" || params.sort === "downloads"
      ? params.sort
      : "trending";

  const skills = await listSkills({
    sort,
    q: params.q,
    category: params.category,
  });

  return (
    <SkillsCatalog
      initialSkills={skills}
      initialSort={sort}
      categories={["All", ...CATEGORIES]}
    />
  );
}
