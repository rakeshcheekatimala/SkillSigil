import Link from "next/link";
import {
  ArrowUpRight,
  DownloadSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { Skill } from "@/data/skills";
import type { SkillView } from "@/lib/skills";
import { TrustBadge } from "@/components/ui/trust-badge";
import { cn, formatCount } from "@/lib/utils";

export function SkillCard({
  skill,
  className,
  dense = false,
}: {
  skill: Skill | SkillView;
  className?: string;
  dense?: boolean;
}) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className={cn(
        "group relative flex flex-col border-b border-border py-6 transition-colors last:border-b-0",
        !dense && "sm:px-4 sm:-mx-4 sm:rounded-lg sm:border sm:border-transparent sm:hover:border-border sm:hover:bg-muted/40",
        dense && "hover:bg-transparent",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground group-hover:text-foreground">
              {skill.name}
            </h3>
            <TrustBadge status={skill.status} />
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {skill.description}
          </p>
        </div>
        <ArrowUpRight
          weight="bold"
          className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="font-mono">@{skill.author.username}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80">
          {skill.category}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="font-medium text-foreground">
            {formatCount(skill.upvoteCount)}
          </span>
          upvotes
        </span>
        <span className="inline-flex items-center gap-1">
          <DownloadSimple className="size-3.5" />
          {formatCount(skill.downloadCount)}
        </span>
      </div>
    </Link>
  );
}
