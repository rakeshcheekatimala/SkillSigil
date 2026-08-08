"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  MagnifyingGlass,
  DownloadSimple,
  SealCheck,
} from "@phosphor-icons/react";

const steps = [
  {
    icon: MagnifyingGlass,
    title: "Discover",
    body: "Search, trending, and categories over skills that already cleared a trust scan.",
  },
  {
    icon: SealCheck,
    title: "Verify",
    body: "Every publish runs SkillTrustOps: structure, secrets, dangerous instructions, and more.",
  },
  {
    icon: DownloadSimple,
    title: "Install",
    body: "Grab a manifest and download URL for VS Code, Cursor, Cloud Code, or your own CLI.",
  },
];

export function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-border bg-background py-24 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Publish once. Trust travels with the skill.
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            SkillSigil is not another dump of prompt packs. It is a registry
            with a gate: GitHub identity, SkillTrustOps scan, then discovery.
          </p>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-md border border-border bg-muted/60">
                <step.icon weight="duotone" className="size-5 text-accent" />
              </div>
              <p className="mb-1 font-mono text-xs text-muted-foreground">
                0{i + 1}
              </p>
              <h3 className="text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
