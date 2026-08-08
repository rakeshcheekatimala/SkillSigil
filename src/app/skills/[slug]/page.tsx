import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  GitBranch,
  Hash,
} from "@phosphor-icons/react/dist/ssr";
import { TrustBadge } from "@/components/ui/trust-badge";
import { UpvoteButton } from "@/components/skills/upvote-button";
import { InstallButton } from "@/components/skills/install-button";
import { formatCount } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { getSkillBySlug, getSkillRowBySlug } from "@/lib/skills";
import { hasUpvoted } from "@/lib/upvotes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) return { title: "Skill not found" };
  return {
    title: skill.name,
    description: skill.description,
  };
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) notFound();

  const session = await getSession();
  const row = await getSkillRowBySlug(slug);
  const initiallyUpvoted =
    session && row ? await hasUpvoted(session.id, row.id) : false;

  return (
    <article className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href="/skills"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to explore
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_320px] lg:gap-16">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <TrustBadge status={skill.status} />
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {skill.category}
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {skill.name}
          </h1>
          <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
            {skill.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <UpvoteButton
              slug={skill.slug}
              initialCount={skill.upvoteCount}
              initiallyUpvoted={initiallyUpvoted}
            />
            <InstallButton slug={skill.slug} />
          </div>

          <div className="mt-12 space-y-6 border-t border-border pt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              Trust report
            </h2>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Risk score
                  </p>
                  <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-foreground">
                    {skill.status === "pending" ? "—" : skill.riskScore}
                  </p>
                </div>
                <TrustBadge status={skill.status} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {skill.findingsSummary ??
                  (skill.status === "pending"
                    ? "SkillTrustOps scan is queued. This skill is not yet discoverable in trending."
                    : "Deterministic static scan via SkillTrustOps / local static gates.")}
              </p>
              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">Policy</dt>
                  <dd className="mt-0.5 font-mono text-xs">recommended-v2</dd>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">Scanner</dt>
                  <dd className="mt-0.5 font-mono text-xs">skilltrustops</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-10 space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6 lg:pt-2">
          <div className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold">Publisher</h2>
            <p className="mt-3 font-mono text-sm">@{skill.author.username}</p>
            <a
              href={`https://github.com/${skill.repo}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              <GitBranch className="size-4" />
              {skill.repo}
            </a>
            <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Hash className="size-3.5" />
              {skill.commitSha}
            </p>
          </div>

          <div className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold">Signals</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Upvotes</dt>
                <dd className="font-medium">{formatCount(skill.upvoteCount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Downloads</dt>
                <dd className="font-medium">
                  {formatCount(skill.downloadCount)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Published</dt>
                <dd className="font-mono text-xs">{skill.createdAt}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-dashed border-border p-5">
            <h2 className="text-sm font-semibold">IDE install</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Copy the manifest URL and paste into your agent or IDE skill
              installer.
            </p>
            <code className="mt-3 block overflow-x-auto rounded-md bg-muted px-2.5 py-2 font-mono text-[11px] text-foreground/80">
              /api/skills/{skill.slug}/manifest
            </code>
          </div>
        </aside>
      </div>
    </article>
  );
}
