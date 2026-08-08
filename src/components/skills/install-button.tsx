"use client";

import { useState } from "react";
import { DownloadSimple, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InstallButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function install() {
    const manifestUrl = `${window.location.origin}/api/skills/${slug}/manifest`;
    try {
      await navigator.clipboard.writeText(manifestUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.open(`/api/skills/${slug}/install`, "_blank");
    }
  }

  return (
    <Button
      type="button"
      onClick={install}
      className={cn(className)}
      variant="default"
    >
      {copied ? (
        <Check weight="bold" className="size-4" />
      ) : (
        <DownloadSimple weight="bold" className="size-4" />
      )}
      {copied ? "Manifest copied" : "Copy install URL"}
    </Button>
  );
}
