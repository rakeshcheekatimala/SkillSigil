import type { Metadata } from "next";
import { PublishForm } from "@/components/skills/publish-form";
import { getSession } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Publish",
  description: "Submit a skill for SkillTrustOps scanning and registry listing.",
};

export const dynamic = "force-dynamic";

export default async function PublishPage() {
  const session = await getSession();

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      {!session ? (
        <div className="mx-auto max-w-xl space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Sign in to publish
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              GitHub sign-in is required so we can verify repository access and
              attribute the skill to you. Locally, Sign in creates a demo session
              until you add a GitHub OAuth App.
            </p>
          </div>
          <a
            href="/api/auth/github?next=/publish"
            className={cn(buttonVariants({ size: "lg" }), "inline-flex")}
          >
            <GithubLogo weight="bold" className="size-4" />
            Sign in with GitHub
          </a>
        </div>
      ) : (
        <PublishForm signedInAs={session.username} />
      )}
    </div>
  );
}
