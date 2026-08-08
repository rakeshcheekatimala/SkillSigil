import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { GuidedWorkspace } from "@/components/publish/guided-workspace";
import { getSession } from "@/lib/auth";
import { getSkillDetail } from "@/lib/skills";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Publish · ${slug}` };
}

export default async function PublishWorkspacePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/github?next=/publish");
  }

  const { slug } = await params;
  const skill = await getSkillDetail(slug, session.id);
  if (!skill) notFound();
  if (skill.ownerUserId !== session.id) {
    redirect(`/skills/${slug}`);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href="/me"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Your skills
      </Link>

      <div className="mt-8">
        <GuidedWorkspace
          skill={{
            slug: skill.slug,
            name: skill.name,
            status: skill.status,
            visibility: skill.visibility,
            counts: skill.counts,
            findings: skill.findings,
            findingsSummary: skill.findingsSummary,
            commitSha: skill.commitSha,
            repo: skill.repo,
            admission: skill.admission,
          }}
        />
      </div>
    </div>
  );
}
