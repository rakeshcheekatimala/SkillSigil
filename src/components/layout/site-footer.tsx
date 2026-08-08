import Link from "next/link";
import { SiteLogo } from "@/components/layout/site-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <SiteLogo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            The registry for agentic skills. Publish, scan with SkillTrustOps,
            and install into your IDE with a trust score attached.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div className="space-y-3">
            <p className="font-medium text-foreground">Product</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/skills" className="hover:text-foreground">
                  Explore
                </Link>
              </li>
              <li>
                <Link href="/publish" className="hover:text-foreground">
                  Publish
                </Link>
              </li>
              <li>
                <Link href="/me" className="hover:text-foreground">
                  Your workspace
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="font-medium text-foreground">Trust</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/scan" className="hover:text-foreground">
                  Scan a skill
                </Link>
              </li>
              <li>
                <Link href="/rules" className="hover:text-foreground">
                  Rule catalogue
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="hover:text-foreground">
                  Methodology
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="font-medium text-foreground">Developers</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <span className="font-mono text-xs">GET /api/skills</span>
              </li>
              <li>
                <span className="font-mono text-xs">
                  GET /api/skills/:slug/manifest
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 text-xs text-muted-foreground sm:px-8">
          <span>SkillSigil · Skills Registry</span>
          <span className="font-mono">v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
