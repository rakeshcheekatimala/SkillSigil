export type ParsedGithubSkillUrl = {
  owner: string;
  repo: string;
  ref: string;
  subpath: string;
};

export function parseGithubSkillUrl(input: string): ParsedGithubSkillUrl | null {
  try {
    const url = new URL(input.trim());
    const host = url.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repo, maybeTree, ref, ...rest] = parts;
    if (maybeTree === "tree" && ref) {
      return {
        owner,
        repo: repo.replace(/\.git$/, ""),
        ref,
        subpath: rest.join("/"),
      };
    }
    return {
      owner,
      repo: repo.replace(/\.git$/, ""),
      ref: "main",
      subpath: "",
    };
  } catch {
    return null;
  }
}

export async function fetchRepoPermission(
  token: string,
  owner: string,
  repo: string,
): Promise<"admin" | "push" | "pull" | "none"> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "SkillSigil",
    },
    cache: "no-store",
  });
  if (!res.ok) return "none";
  const data = (await res.json()) as {
    permissions?: { admin?: boolean; push?: boolean; pull?: boolean };
  };
  if (data.permissions?.admin) return "admin";
  if (data.permissions?.push) return "push";
  if (data.permissions?.pull) return "pull";
  return "none";
}

export async function resolveCommitSha(
  owner: string,
  repo: string,
  ref: string,
  token?: string | null,
): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "SkillSigil",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`,
    { headers, cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`Could not resolve commit for ${owner}/${repo}@${ref}`);
  }
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

export async function fetchSkillMarkdown(opts: {
  owner: string;
  repo: string;
  ref: string;
  subpath: string;
  token?: string | null;
}): Promise<string> {
  const path = [opts.subpath, "SKILL.md"].filter(Boolean).join("/");
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw",
    "User-Agent": "SkillSigil",
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(
    `https://api.github.com/repos/${opts.owner}/${opts.repo}/contents/${path}?ref=${encodeURIComponent(opts.ref)}`,
    { headers, cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`SKILL.md not found at ${path}`);
  }
  return res.text();
}

export async function dispatchScanWorkflow(input: {
  skillId: string;
  scanId: string;
  owner: string;
  repo: string;
  ref: string;
  subpath: string;
  commitSha: string;
  callbackUrl: string;
}): Promise<{ ok: boolean; mode: "actions" | "local"; detail?: string }> {
  const token = process.env.GITHUB_TOKEN;
  const workflowRepo =
    process.env.SCAN_WORKFLOW_REPO ?? "rakeshcheekatimala/SkillSigil";
  const workflowRef = process.env.SCAN_WORKFLOW_REF ?? "main";

  if (!token) {
    return { ok: false, mode: "local", detail: "GITHUB_TOKEN unset" };
  }

  const res = await fetch(
    `https://api.github.com/repos/${workflowRepo}/actions/workflows/skilltrustops-scan.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "SkillSigil",
      },
      body: JSON.stringify({
        ref: workflowRef,
        inputs: {
          skill_id: input.skillId,
          scan_id: input.scanId,
          owner: input.owner,
          repo: input.repo,
          ref: input.ref,
          subpath: input.subpath,
          commit_sha: input.commitSha,
          callback_url: input.callbackUrl,
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, mode: "actions", detail: text };
  }
  return { ok: true, mode: "actions" };
}
