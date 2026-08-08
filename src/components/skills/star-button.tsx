"use client";

import { useState } from "react";
import { Star } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn, formatCount } from "@/lib/utils";

export function StarButton({
  slug,
  initialCount,
  initiallyStarred,
  className,
}: {
  slug: string;
  initialCount: number;
  initiallyStarred: boolean;
  className?: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [starred, setStarred] = useState(initiallyStarred);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/skills/${slug}/star`, {
        method: starred ? "DELETE" : "POST",
      });
      if (res.status === 401) {
        window.location.href = `/api/auth/github?next=/skills/${slug}`;
        return;
      }
      const data = (await res.json()) as { starred?: boolean; count?: number };
      if (!res.ok) return;
      setStarred(Boolean(data.starred));
      if (typeof data.count === "number") setCount(data.count);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={starred ? "accent" : "outline"}
      onClick={toggle}
      disabled={pending}
      className={cn(className)}
      aria-pressed={starred}
    >
      <Star weight={starred ? "fill" : "regular"} className="size-4" />
      {starred ? "Starred" : "Star"}
      <span className="font-mono text-xs opacity-80">{formatCount(count)}</span>
    </Button>
  );
}
