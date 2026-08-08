"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function CopyField({
  value,
  label,
  className,
  multiline = false,
}: {
  value: string;
  label?: string;
  className?: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      <div className="flex items-stretch gap-2">
        <code
          className={cn(
            "min-w-0 flex-1 rounded-md border border-border bg-muted/50 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground/80",
            multiline ? "whitespace-pre-wrap break-all" : "overflow-x-auto whitespace-nowrap",
          )}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy to clipboard"}
          className="shrink-0 self-start rounded-md border border-border px-2 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? (
            <Check weight="bold" className="size-3.5 text-accent" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
