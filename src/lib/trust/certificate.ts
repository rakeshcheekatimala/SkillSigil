/**
 * Trust certificates — the "sigil".
 *
 * A certificate is a content-addressed record of one scan decision. The
 * canonical JSON is published verbatim at /api/cert/:slug, and the digest is
 * SHA-256 over exactly those bytes, so anyone can recompute it independently
 * instead of trusting our rendering of it.
 *
 * This is integrity and reproducibility, not authenticity: the digest proves
 * the record has not changed, it does not prove who issued it. Publisher-key
 * signing (Ed25519 / Sigstore, per the agentskills provenance RFCs) is the
 * next step and is deliberately not claimed anywhere in the UI yet.
 */

import { decisionFor, type NormalisedFinding, type SeverityCounts } from "@/lib/trust/decision";
import { POLICY } from "@/lib/trust/rules";

export const CERTIFICATE_SCHEMA = "skillsigil.certificate/v1";
export const CERTIFICATE_DIGEST_ALGORITHM = "sha256";

export type CertificateInput = {
  slug: string;
  name: string;
  repository: string;
  commitSha: string;
  status: string;
  policyHash: string | null;
  toolVersion: string | null;
  scanId: string | null;
  completedAt: Date | null;
  durationMs: number | null;
  findings: NormalisedFinding[];
  counts: SeverityCounts;
};

export type CertificateRecord = {
  schema: string;
  skill: {
    slug: string;
    name: string;
    repository: string;
    commit: string;
  };
  decision: {
    code: string;
    status: string;
  };
  policy: {
    profile: string;
    hash: string | null;
  };
  scanner: {
    name: string;
    version: string | null;
  };
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    rules: string[];
  };
  scan: {
    id: string | null;
    completed_at: string | null;
    duration_ms: number | null;
  };
};

export function buildCertificate(input: CertificateInput): CertificateRecord {
  const rules = [...new Set(input.findings.map((f) => f.ruleId))].sort();

  return {
    schema: CERTIFICATE_SCHEMA,
    skill: {
      slug: input.slug,
      name: input.name,
      repository: input.repository,
      commit: input.commitSha,
    },
    decision: {
      code: decisionFor(input.status).code,
      status: input.status,
    },
    policy: {
      profile: POLICY.profile,
      hash: input.policyHash,
    },
    scanner: {
      name: POLICY.scanner,
      version: input.toolVersion,
    },
    findings: {
      critical: input.counts.critical,
      high: input.counts.high,
      medium: input.counts.medium,
      low: input.counts.low,
      total: input.counts.total,
      rules,
    },
    scan: {
      id: input.scanId,
      completed_at: input.completedAt ? input.completedAt.toISOString() : null,
      duration_ms: input.durationMs,
    },
  };
}

/**
 * Deterministic JSON: object keys sorted, no insignificant whitespace. Two
 * parties must be able to serialise the same record to the same bytes.
 */
export function canonicalise(value: unknown): string {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalise).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalise(v)}`)
      .join(",")}}`;
  }
  return "null";
}

export async function digestCertificate(record: CertificateRecord): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalise(record));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type Certificate = {
  record: CertificateRecord;
  canonical: string;
  digest: string;
  /** `sha256:<hex>` — the form shown in the UI and in the badge. */
  digestUri: string;
  shortDigest: string;
};

export async function issueCertificate(
  input: CertificateInput,
): Promise<Certificate> {
  const record = buildCertificate(input);
  const canonical = canonicalise(record);
  const digest = await digestCertificate(record);
  return {
    record,
    canonical,
    digest,
    digestUri: `${CERTIFICATE_DIGEST_ALGORITHM}:${digest}`,
    shortDigest: digest.slice(0, 12),
  };
}

/**
 * The exact command a reader can run to reproduce the digest.
 *
 * /api/cert/:slug returns the canonical bytes verbatim — no re-serialisation,
 * no trailing newline — so hashing the response body is the whole check.
 */
export function verifyCommand(origin: string, slug: string) {
  return `curl -s ${origin}/api/cert/${slug} | shasum -a 256`;
}
