/**
 * Decision vocabulary and finding normalisation.
 *
 * SkillTrustOps deliberately does not emit a single quality score, and its
 * `certify` output marks unsupported controls as NOT ASSESSED rather than
 * passing them. The registry mirrors that: we report a decision plus the
 * evidence behind it, and we never round evidence up into a safety claim.
 */

import type { Severity } from "@/lib/trust/rules";

/** Row-level status as persisted on `skills.status` / `scans.status`. */
export type ScanRecordStatus =
  | "passed"
  | "failed"
  | "flagged"
  | "pending"
  | "error";

export type Decision = {
  /** The scanner's own term, shown wherever there is room for it. */
  code: "passed_scope" | "blocked" | "inconclusive" | "in_progress";
  label: string;
  /** One line a visitor can act on without reading the methodology page. */
  meaning: string;
  tone: "pass" | "block" | "unknown" | "progress";
};

export const DECISIONS: Record<ScanRecordStatus, Decision> = {
  passed: {
    code: "passed_scope",
    label: "Scan passed",
    meaning:
      "No findings under recommended-v2 for the exact commit that was scanned. Scoped evidence, not a guarantee of safety.",
    tone: "pass",
  },
  failed: {
    code: "blocked",
    label: "Blocked",
    meaning:
      "At least one deterministic rule matched. The findings below are the reason, with rule IDs you can look up.",
    tone: "block",
  },
  flagged: {
    code: "blocked",
    label: "Flagged",
    meaning:
      "Held for review after a rule matched or a report was disputed. Treat as unresolved.",
    tone: "block",
  },
  pending: {
    code: "in_progress",
    label: "Scanning",
    meaning:
      "The scan has not completed, so there is no decision yet. Absence of findings here is not a pass.",
    tone: "progress",
  },
  error: {
    code: "inconclusive",
    label: "Inconclusive",
    meaning:
      "The scanner could not produce a reliable result. Never read this as a pass.",
    tone: "unknown",
  },
};

export function decisionFor(status: string): Decision {
  if (status === "passed") return DECISIONS.passed;
  if (status === "failed") return DECISIONS.failed;
  if (status === "flagged") return DECISIONS.flagged;
  if (status === "error") return DECISIONS.error;
  return DECISIONS.pending;
}

export type NormalisedFinding = {
  ruleId: string;
  severity: Severity;
  message: string;
  line?: number;
  path?: string;
  /** Redacted evidence when the scanner supplies it. */
  evidence?: string;
};

export type SeverityCounts = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
};

export const EMPTY_COUNTS: SeverityCounts = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  total: 0,
};

function asSeverity(value: unknown): Severity {
  const s = String(value ?? "").toLowerCase();
  if (s === "critical" || s === "high" || s === "medium" || s === "low") return s;
  return "medium";
}

function pickString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

/**
 * Findings arrive from two producers with different shapes: the local preflight
 * and the SkillTrustOps JSON report relayed by the scan workflow. Accept both
 * rather than assuming one.
 */
export function normaliseFindings(raw: unknown): NormalisedFinding[] {
  const container =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const items = Array.isArray(container.items)
    ? container.items
    : Array.isArray(container.findings)
      ? container.findings
      : Array.isArray(raw)
        ? raw
        : [];

  const out: NormalisedFinding[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const location =
      item.location && typeof item.location === "object"
        ? (item.location as Record<string, unknown>)
        : {};

    const ruleId = pickString(item, ["rule", "rule_id", "ruleId", "id", "code"]);
    if (!ruleId) continue;

    out.push({
      ruleId: ruleId.toUpperCase(),
      severity: asSeverity(item.severity ?? item.level),
      message:
        pickString(item, ["message", "title", "description"]) ??
        "Finding reported without a message.",
      line: pickNumber(item, ["line", "line_number"]) ?? pickNumber(location, ["line"]),
      path: pickString(item, ["path", "file"]) ?? pickString(location, ["path", "file"]),
      evidence: pickString(item, ["evidence", "snippet"]),
    });
  }

  return out.sort((a, b) => {
    const order: Severity[] = ["critical", "high", "medium", "low"];
    const bySeverity = order.indexOf(a.severity) - order.indexOf(b.severity);
    if (bySeverity !== 0) return bySeverity;
    if (a.ruleId !== b.ruleId) return a.ruleId.localeCompare(b.ruleId);
    return (a.line ?? 0) - (b.line ?? 0);
  });
}

export function countSeverities(findings: NormalisedFinding[]): SeverityCounts {
  const counts = { ...EMPTY_COUNTS };
  for (const f of findings) {
    counts[f.severity] += 1;
    counts.total += 1;
  }
  return counts;
}

export function findingsSummaryText(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const summary = (raw as Record<string, unknown>).summary;
  return typeof summary === "string" && summary.trim() ? summary.trim() : undefined;
}
