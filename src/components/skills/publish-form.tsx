"use client";

import { useState, type FormEvent } from "react";
import { SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PublishForm({ signedInAs }: { signedInAs: string }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Productivity");
  const [status, setStatus] = useState<"idle" | "submitting" | "queued" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");

    const trimmed = url.trim();
    if (!trimmed.includes("/tree/") || !/\/tree\/[^/]+\/.+/.test(trimmed)) {
      setStatus("error");
      setMessage(
        "Link must point at a skill directory, not the repo root. Example: https://github.com/you/repo/tree/main/skills/my-skill",
      );
      return;
    }

    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "github",
          githubUrl: url,
          name: name || undefined,
          category: category || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        slug?: string;
        code?: string;
        status?: string;
        scanMode?: string;
        next?: string;
        visibility?: string;
      };
      if (res.status === 401) {
        window.location.href = "/api/auth/github?next=/publish";
        return;
      }
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setStatus("queued");
      setMessage(
        data.slug
          ? `Private draft created. Scan ${data.status ?? "queued"} — opening the guided workspace…`
          : "Accepted for scan.",
      );
      if (data.slug) {
        window.setTimeout(() => {
          window.location.href = data.next || `/publish/${data.slug}`;
        }, 700);
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Publish a skill
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Signed in as{" "}
          <span className="font-mono text-foreground">@{signedInAs}</span>.
          Point us at a GitHub path that contains a{" "}
          <span className="font-mono text-xs">SKILL.md</span>. We create a
          private draft, scan it, and only list it after you admit a passing
          result — nothing is discoverable until then.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="github-url" className="text-sm font-medium">
          GitHub skill URL
        </label>
        <Input
          id="github-url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/you/repo/tree/main/skills/my-skill"
        />
        <p className="text-xs text-muted-foreground">
          Must resolve to a directory (or file path) with{" "}
          <span className="font-mono">SKILL.md</span>. Example:{" "}
          <span className="font-mono break-all">
            https://github.com/rakeshcheekatimala/skilltrustops/tree/main/examples/valid-skill
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Display name (optional)
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My skill"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Security"
          />
        </div>
      </div>

      <Button type="submit" disabled={status === "submitting"} size="lg">
        {status === "submitting" ? (
          <>
            <SpinnerGap className="size-4 animate-spin" />
            Scanning…
          </>
        ) : (
          "Create private draft"
        )}
      </Button>

      {message && (
        <p
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            status === "error"
              ? "border-destructive/30 bg-red-50 text-destructive"
              : "border-accent/30 bg-accent-soft text-accent",
          )}
        >
          {message}
        </p>
      )}
    </form>
  );
}
