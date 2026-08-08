"use client";

import { useMemo, useState, useTransition } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import type { Skill } from "@/data/skills";
import { SkillCard } from "@/components/skills/skill-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SkillView } from "@/lib/skills";

type SortMode = "trending" | "newest" | "downloads";

export function SkillsCatalog({
  initialSkills,
  initialSort = "trending",
  categories = ["All"],
}: {
  initialSkills: Array<Skill | SkillView>;
  initialSort?: SortMode;
  categories?: string[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState<SortMode>(initialSort);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = initialSkills.filter((s) => {
      const catOk = category === "All" || s.category === category;
      if (!catOk) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.includes(q)) ||
        s.author.username.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sort === "newest") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (sort === "downloads") {
        return b.downloadCount - a.downloadCount;
      }
      return (
        b.upvoteCount + b.downloadCount - (a.upvoteCount + a.downloadCount)
      );
    });

    return list;
  }, [initialSkills, query, category, sort]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Explore skills
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          A curated catalog of agentic skills. Every published skill carries a
          SkillTrustOps scan result.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              startTransition(() => setQuery(v));
            }}
            placeholder="Search skills, tags, authors…"
            className="pl-9"
            aria-label="Search skills"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["trending", "Trending"],
              ["newest", "Newest"],
              ["downloads", "Downloads"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                sort === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 edge-fade">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              category === c
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        {filtered.length} skill{filtered.length === 1 ? "" : "s"}
      </div>

      <div className="mt-2 divide-y divide-border border-t border-border">
        {filtered.map((skill) => (
          <SkillCard key={skill.slug} skill={skill} dense />
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {initialSkills.length === 0
                ? "The registry is empty. Publish a real skill from a GitHub URL to get started."
                : "No skills match that search."}
            </p>
            {initialSkills.length === 0 && (
              <a
                href="/publish"
                className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
              >
                Publish a skill
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
