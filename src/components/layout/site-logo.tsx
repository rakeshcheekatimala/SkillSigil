import Link from "next/link";
import { cn } from "@/lib/utils";

export function SiteLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2.5 text-foreground",
        className,
      )}
      aria-label="SkillSigil home"
    >
      <span className="relative flex size-7 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground shadow-sm">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.55),transparent_55%)] opacity-80 transition-opacity group-hover:opacity-100" />
        <span className="relative font-mono text-[11px] font-semibold tracking-tight">
          SS
        </span>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">SkillSigil</span>
    </Link>
  );
}
