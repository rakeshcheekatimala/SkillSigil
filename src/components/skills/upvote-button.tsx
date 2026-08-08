"use client";

import { useState } from "react";
import { CaretUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn, formatCount } from "@/lib/utils";

export function UpvoteButton({
  slug,
  initialCount,
  initiallyUpvoted = false,
  className,
}: {
  slug: string;
  initialCount: number;
  initiallyUpvoted?: boolean;
  className?: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initiallyUpvoted);
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function toggle() {
    if (pending) return;
    setPending(true);
    setHint(null);
    const next = !voted;

    try {
      const res = await fetch(`/api/skills/${slug}/upvote`, {
        method: next ? "POST" : "DELETE",
      });
      if (res.status === 401) {
        setHint("Sign in to upvote");
        window.location.href = "/api/auth/github";
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { count: number; upvoted: boolean };
      setCount(data.count);
      setVoted(data.upvoted);
    } catch {
      setHint("Could not update vote");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        type="button"
        variant={voted ? "accent" : "outline"}
        onClick={toggle}
        disabled={pending}
        className={cn("min-w-[7.5rem]", className)}
        aria-pressed={voted}
      >
        <CaretUp weight="bold" className="size-4" />
        {formatCount(count)}
      </Button>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
