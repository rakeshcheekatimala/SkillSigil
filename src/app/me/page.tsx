import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Star } from "@phosphor-icons/react/dist/ssr";
import { SkillCard } from "@/components/skills/skill-card";
import { TrustBadge } from "@/components/ui/trust-badge";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { listSkills } from "@/lib/skills";
import { cn } from "@/lib/utils";
import { getDb } from "@/db";
import { scans, skills, stars, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { toSkillView } from "@/lib/skills";

export const metadata: Metadata = {
  title: "Your workspace",
  description: "Drafts, listed skills, and starred collections.",
};

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/github?next=/me");
  }

  const mine = await listSkills({
    ownerUserId: session.id,
    visibility: "all",
    sort: "newest",
  });
  const drafts = mine.filter((s) => s.visibility === "draft");
  const listed = mine.filter((s) => s.visibility === "public");

  const db = getDb();
  const starredRows = await db
    .select({
      skill: skills,
      username: users.username,
      avatarUrl: users.avatarUrl,
      findings: scans.findings,
    })
    .from(stars)
    .innerJoin(skills, eq(stars.skillId, skills.id))
    .innerJoin(users, eq(skills.ownerUserId, users.id))
    .leftJoin(scans, eq(scans.id, skills.latestScanId))
    .where(eq(stars.userId, session.id))
    .orderBy(desc(stars.createdAt))
    .limit(50);

  const starred = starredRows
    .filter((r) => r.skill.visibility === "public")
    .map((r) =>
      toSkillView(
        r.skill,
        { username: r.username, avatarUrl: r.avatarUrl },
        r.findings === null ? null : { findings: r.findings },
      ),
    );

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
            Signed in as @{session.username}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your workspace
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground leading-relaxed">
            Private drafts stay invisible until you admit a passing scan. Stars
            are your personal collection.
          </p>
        </div>
        <Link
          href="/publish"
          className={cn(buttonVariants({ size: "lg" }), "inline-flex gap-2")}
        >
          New draft
          <ArrowRight weight="bold" className="size-4" />
        </Link>
      </div>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Drafts ({drafts.length})
          </h2>
          <p className="text-xs text-muted-foreground">Not listed publicly</p>
        </div>
        {drafts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No drafts yet.{" "}
            <Link href="/publish" className="text-accent hover:underline">
              Publish a skill
            </Link>{" "}
            to start a private scan.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {drafts.map((skill) => (
              <li
                key={skill.slug}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/publish/${skill.slug}`}
                      className="font-medium hover:underline"
                    >
                      {skill.name}
                    </Link>
                    <TrustBadge status={skill.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {skill.repo} · {skill.commitSha}
                  </p>
                </div>
                <Link
                  href={`/publish/${skill.slug}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Open workspace
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">
          Listed ({listed.length})
        </h2>
        {listed.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing listed yet. Admit a passing draft to issue a sigil and appear
            in the catalog.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-border border-t border-border">
            {listed.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} dense />
            ))}
          </div>
        )}
      </section>

      <section className="mt-14">
        <div className="flex items-center gap-2">
          <Star weight="fill" className="size-5 text-accent" />
          <h2 className="text-xl font-semibold tracking-tight">
            Starred ({starred.length})
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Your personal collection. Install still never requires an account —
          starring is how you keep a list.
        </p>
        {starred.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Browse the{" "}
            <Link href="/skills" className="text-accent hover:underline">
              catalog
            </Link>{" "}
            and star skills you trust.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-border border-t border-border">
            {starred.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} dense />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
