import Link from "next/link";
import { GithubLogo, SignOut } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { SiteLogo } from "@/components/layout/site-logo";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/skills", label: "Explore" },
  { href: "/scan", label: "Scan" },
  { href: "/rules", label: "Rules" },
  { href: "/publish", label: "Publish" },
];

export async function SiteHeader() {
  const user = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <SiteLogo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/skills"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            Browse skills
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/me"
                className="hidden font-mono text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                @{user.username}
              </Link>
              {/* Full document navigation so Set-Cookie / clear is applied */}
              <a
                href="/api/auth/logout"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                title="Sign out"
              >
                <SignOut className="size-4" />
                <span className="sr-only sm:not-sr-only">Sign out</span>
              </a>
            </div>
          ) : (
            <a
              href="/api/auth/github"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <GithubLogo weight="bold" className="size-4" />
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
