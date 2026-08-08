import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[1400px] flex-col items-start justify-center px-5 sm:px-8">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        That skill or route does not exist in the registry.
      </p>
      <Link href="/skills" className={cn(buttonVariants(), "mt-8")}>
        Browse skills
      </Link>
    </div>
  );
}
