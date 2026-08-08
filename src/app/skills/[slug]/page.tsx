import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  GitBranch,
  Hash,
  SealCheck,
} from "@phosphor-icons/react/dist/ssr";
import { FindingsTable } from "@/components/trust/findings-table";
import { InstallButton } from "@/components/skills/install-button";
import { StarButton } from "@/components/skills/star-button";
import { UpvoteButton } from "@/components/skills/upvote-button";
import { CopyField } from "@/components/ui/copy-field";
import { SeverityCountsRow } from "@/components/ui/severity-counts";
import { TrustBadge } from "@/components/ui/trust-badge";
import { formatCount } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { getSkillDetail } from "@/lib/skills";
import { hasUpvoted } from "@/lib/upvotes";
import { hasStarred } from "@/lib/stars";
import { badgeSnippet } from "@/lib/trust/sigil";
import { decisionFor } from "@/lib/trust/decision";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const session = await getSession();
  const skill = await getSkillDetail(slug, session?.id);
  if (!skill) return { title: "Skill not found" };
  return {
    title: skill.name,
    description: skill.description,
  };
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getSession();
  const skill = await getSkillDetail(slug, session?.id);
  if (!skill) notFound();

  const isOwner = session?.id === skill.ownerUserId;
  const initiallyUpvoted = session
    ? await hasUpvoted(session.id, skill.id)
    : false;
  const initiallyStarred = session
    ? await hasStarred(session.id, skill.id)
    : false;

  const origin =
    process.env.APP_URL?.replace(/\/$/, "") || "https://skillsigil.dev";
  const decision = decisionFor(skill.status);

  return (
    <article className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href={skill.visibility === "draft" ? "/me" : "/skills"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {skill.visibility === "draft" ? "Back to drafts" : "Back to explore"}
      </Link>

      {skill.visibility === "draft" && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning">
          Private draft — invisible in the public catalog.{" "}
          <Link
            href={`/publish/${skill.slug}`}
            className="font-medium underline"
          >
            Open the guided workspace
          </Link>{" "}
          to remediate and admit.
        </div>
      )}

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_320px] lg:gap-16">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <TrustBadge status={skill.status} showCode />
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {skill.category}
            </span>
            {skill.visibility === "draft" && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-warning ring-1 ring-inset ring-warning/20">
                Draft
              </span>
            )}
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {skill.name}
          </h1>
          <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
            {skill.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {skill.visibility === "public" && (
              <>
                <UpvoteButton
                  slug={skill.slug}
                  initialCount={skill.upvoteCount}
                  initiallyUpvoted={initiallyUpvoted}
                />
                <StarButton
                  slug={skill.slug}
                  initialCount={skill.starCount}
                  initiallyStarred={initiallyStarred}
                />
                <InstallButton slug={skill.slug} />
              </>
            )}
            {isOwner && (
              <Link
                href={`/publish/${skill.slug}`}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
              >
                <SealCheck className="size-4" />
                Guided workspace
              </Link>
            )}
          </div>

          <div className="mt-12 space-y-6 border-t border-border pt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Trust report
                </h2>
                <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                  {decision.meaning}
                </p>
              </div>
              <SeverityCountsRow counts={skill.counts} emphasiseZero />
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {skill.findingsSummary ??
                  (skill.status === "pending"
                    ? "Scan is queued. Absence of findings here is not a pass."
                    : "Deterministic static scan. The skill content was not executed.")}
              </p>
              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">Policy</dt>
                  <dd className="mt-0.5 font-mono text-xs">
                    {skill.scan?.policyHash ?? "recommended-v2"}
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">Scanner</dt>
                  <dd className="mt-0.5 font-mono text-xs">
                    {skill.scan?.toolVersion ?? "skilltrustops"}
                  </dd>
                </div>
              </dl>
            </div>

            {skill.findings.length > 0 && (
              <FindingsTable findings={skill.findings} />
            )}
          </div>

          {skill.visibility === "public" && skill.admission && (
            <div className="mt-10 space-y-4 border-t border-border pt-10">
              <h2 className="text-lg font-semibold tracking-tight">Sigil</h2>
              <p className="text-sm text-muted-foreground">
                Registry-issued attestation for the admitted commit. Embed the
                badge in your README.
              </p>
              {skill.admission.digestUri && (
                <CopyField label="Digest" value={skill.admission.digestUri} />
              )}
              <CopyField
                label="README badge"
                value={badgeSnippet(origin, skill.slug)}
              />
              <Link
                href={`/cert/${skill.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                Open certificate
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          )}

          {skill.tags.length > 0 && (
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
          )}
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
                <dt className="text-muted-foreground">Stars</dt>
                <dd className="font-medium">{formatCount(skill.starCount)}</dd>
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

          {skill.visibility === "public" && (
            <div className="rounded-xl border border-dashed border-border p-5">
              <h2 className="text-sm font-semibold">IDE install</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                No account required. Copy the manifest URL into your agent.
              </p>
              <code className="mt-3 block overflow-x-auto rounded-md bg-muted px-2.5 py-2 font-mono text-[11px] text-foreground/80">
                /api/skills/{skill.slug}/manifest
              </code>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
