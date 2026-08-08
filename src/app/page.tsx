import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SkillCard } from "@/components/skills/skill-card";
import { listSkills } from "@/lib/skills";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const trending = (await listSkills({ sort: "trending" }))
    .filter((s) => s.status === "passed")
    .slice(0, 4);

  return (
    <>
      <Hero />
      <HowItWorks />

      <section className="border-t border-border bg-muted/30 py-24 sm:py-28">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Trending this week
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Skills the community is installing and upvoting — all with a
                passing trust scan.
              </p>
            </div>
            <Link
              href={trending.length ? "/skills?sort=trending" : "/publish"}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-fit gap-2",
              )}
            >
              {trending.length ? "View all" : "Be the first to publish"}
              <ArrowRight weight="bold" className="size-4" />
            </Link>
          </div>

          {trending.length > 0 ? (
            <div className="mt-10 grid gap-0 border-t border-border md:grid-cols-2 md:gap-x-10">
              {trending.map((skill) => (
                <SkillCard key={skill.slug} skill={skill} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-xl border border-dashed border-border bg-background/60 px-6 py-14 text-center">
              <p className="text-sm text-muted-foreground">
                No published skills yet. Sign in with GitHub and submit a real
                skill directory to start the registry.
              </p>
              <Link
                href="/publish"
                className={cn(buttonVariants({ size: "lg" }), "mt-6 inline-flex")}
              >
                Publish the first skill
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-border py-24 sm:py-28">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ship a skill. Attach a seal.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Connect GitHub, submit a skill path, and let SkillTrustOps produce
              a deterministic report before discovery.
            </p>
            <Link
              href="/publish"
              className={cn(buttonVariants({ size: "lg" }), "mt-8 inline-flex")}
            >
              Start publishing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
