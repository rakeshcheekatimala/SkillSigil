"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 hero-wash" />
      <div className="pointer-events-none absolute inset-0 hero-grid" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col justify-center px-5 pb-24 pt-20 sm:px-8 sm:pb-28 sm:pt-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <p className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-accent">
            <ShieldCheck weight="fill" className="size-4" />
            Scanned by SkillTrustOps before publish
          </p>

          <h1 className="text-balance text-5xl font-semibold tracking-tighter text-foreground sm:text-6xl md:text-7xl md:leading-[0.95]">
            SkillSigil
          </h1>

          <p className="mt-5 max-w-[42ch] text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            The living registry of agentic skills. Discover trusted skills,
            install them into your IDE, and publish yours with a scan attached.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/skills"
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              Explore skills
              <ArrowRight weight="bold" className="size-4" />
            </Link>
            <Link
              href="/publish"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Publish a skill
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 max-w-4xl"
          aria-hidden
        >
          <div className="overflow-hidden rounded-xl border border-border bg-background/80 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="font-mono text-xs text-muted-foreground">
                skilltrustops · static scan
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                live
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-foreground/90">
              <code>
                <span className="text-muted-foreground">$</span> uv run
                skilltrustops scan path/to/skill --format json
                {"\n"}
                <span className="text-accent">PASS</span> lint · security ·
                privacy
                {"\n"}
                risk_score: <span className="text-accent">12</span>
                {"  "}policy: recommended-v2
                {"\n"}
                findings: 0 critical · 0 high · 0 medium
              </code>
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
