/**
 * Web preflight engine — a SKILL.md-only subset of the SkillTrustOps
 * `recommended-v2` policy.
 *
 * Scope is deliberately narrow and must stay honest: this reads one Markdown
 * file over HTTPS, so it can only decide rules that are detectable from that
 * text. Rules needing the adjacent package (archives, symlinks, manifests,
 * lifecycle hooks, cross-file delegation) and the privacy gate are CLI-only,
 * and every surface that renders these results says so.
 *
 * Nothing here executes the submitted content. Matched secret values are
 * redacted before they leave this module.
 */

import type { NormalisedFinding } from "@/lib/trust/decision";
import { countSeverities, type SeverityCounts } from "@/lib/trust/decision";
import { getRule, type Severity } from "@/lib/trust/rules";

/** Mirrors the scanner's 1 MiB per-file decoded-text bound. */
export const MAX_INPUT_BYTES = 1024 * 1024;

export const PREFLIGHT_VERSION = "skillsigil-preflight/0.2.0";
export const PREFLIGHT_POLICY_HASH = "recommended-v2-preflight-subset";

const SPEC_FRONT_MATTER_KEYS = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
]);

const PLACEHOLDER = /example|placeholder|changeme|change_me|redacted|dummy|your[-_]?|xxx|\$\{[^}]*\}|<[^>]*>/i;

type LineDetector = {
  ruleId: string;
  re: RegExp;
  /** Set when a match should not be reported verbatim. */
  redact?: boolean;
  /** Extra guard applied after the pattern matches. */
  skip?: (line: string) => boolean;
};

const DETECTORS: LineDetector[] = [
  // Secrets and credentials
  {
    ruleId: "STO-SEC-001",
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/i,
    redact: true,
  },
  { ruleId: "STO-SEC-002", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, redact: true },
  { ruleId: "STO-SEC-003", re: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/, redact: true },
  {
    ruleId: "STO-SEC-004",
    re: /\b(?:api[-_]?key|access[-_]?token|auth[-_]?token|password|passwd|secret|client[-_]?secret)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    redact: true,
    skip: (line) => PLACEHOLDER.test(line),
  },

  // Dangerous instructions
  { ruleId: "STO-SEC-100", re: /(?<![\w.])(?:eval|exec)\s*\(/ },
  { ruleId: "STO-SEC-101", re: /\brm\s+(?:-[a-zA-Z]*[rf][a-zA-Z]*\s+|--force\b|--recursive\b)/i },
  {
    ruleId: "STO-SEC-102",
    re: /\b(?:curl|wget)\b[^|\n]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b/i,
  },
  {
    ruleId: "STO-SEC-103",
    re: /\bos\.system\s*\(|\bsubprocess\.[A-Za-z_]+\([^)]*shell\s*=\s*True/,
  },

  // Complete-package risk detectable from SKILL.md text
  {
    ruleId: "STO-PKG-200",
    re: /\b(?:ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?|disregard\s+(?:all\s+)?(?:previous|prior|earlier)\s+(?:instructions?|rules?)|you\s+are\s+now\s+(?:in\s+)?developer\s+mode|system\s+prompt\s+override|override\s+(?:your\s+)?(?:safety|system)\s+(?:rules?|instructions?|guidelines?)|do\s+not\s+tell\s+the\s+user|without\s+(?:informing|telling|asking)\s+the\s+user|bypass\s+(?:all\s+)?(?:confirmation|approval|safety)\b)/i,
  },
  {
    ruleId: "STO-PKG-201",
    re: /\bbase64\s+(?:-d|--decode)\b|\bbase64\.b64decode\s*\(|\batob\s*\(|\bcodecs\.decode\s*\(|String\.fromCharCode\s*\(|\bxxd\s+-r\b/,
  },
  {
    ruleId: "STO-PKG-202",
    re: /\bcrontab\s+-|\blaunchctl\s+(?:load|bootstrap)\b|systemctl\s+(?:enable|--user\s+enable)\b|>>\s*~?\/?[^\s]*\.(?:bashrc|zshrc|profile|bash_profile)\b|authorized_keys\b|LaunchAgents\b|\bregistry\s+add\b/i,
  },
  {
    ruleId: "STO-PKG-203",
    re: /\b(?:curl|wget|http[sx]?_proxy)\b[^\n]*(?:-d|--data(?:-binary|-raw)?|-F|--upload-file)\s|\bnc\s+-[a-z]*\s*[\d.]+\s+\d+|requests\.post\s*\(|fetch\s*\([^)]*method\s*:\s*['"]POST/i,
    skip: (line) => !/(?:secret|token|key|credential|\.env\b|password|~\/\.ssh|id_rsa|history|\$\(|env\b)/i.test(line),
  },
  {
    ruleId: "STO-PKG-204",
    re: /\bchmod\s+(?:-R\s+)?0?777\b|\bchmod\s+\+s\b|\bsudo\s+(?:-S\s+)?[a-z]|\bchown\s+root\b|\bsetuid\b/i,
  },
];

function redactLine(line: string, match: RegExpMatchArray | null): string {
  const trimmed = line.trim().slice(0, 200);
  if (!match?.[0]) return trimmed;
  const token = match[0];
  const keep = token.length > 8 ? 4 : 0;
  const masked = keep
    ? `${token.slice(0, keep)}${"•".repeat(Math.min(12, token.length - keep))}`
    : "•".repeat(Math.min(12, Math.max(4, token.length)));
  return trimmed.replace(token, masked).slice(0, 200);
}

type FrontMatter = {
  present: boolean;
  keys: string[];
  name?: string;
};

export function parseFrontMatter(content: string): FrontMatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(content);
  if (!match) return { present: false, keys: [] };

  const keys: string[] = [];
  let name: string | undefined;
  for (const line of match[1].split(/\r?\n/)) {
    // Top-level keys only: nested mappings are indented.
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    keys.push(kv[1]);
    if (kv[1] === "name") {
      name = kv[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return { present: true, keys, name };
}

function severityOf(ruleId: string): Severity {
  return getRule(ruleId)?.severity ?? "medium";
}

function messageOf(ruleId: string): string {
  const rule = getRule(ruleId);
  return rule ? rule.title : "Finding reported by the preflight subset.";
}

/** Fenced-code awareness lets us report a more useful location, not skip lines. */
function scanLines(content: string): NormalisedFinding[] {
  const findings: NormalisedFinding[] = [];
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    for (const detector of DETECTORS) {
      if (detector.skip?.(line)) continue;
      const match = detector.re.exec(line);
      if (!match) continue;
      findings.push({
        ruleId: detector.ruleId,
        severity: severityOf(detector.ruleId),
        message: messageOf(detector.ruleId),
        line: index + 1,
        path: "SKILL.md",
        evidence: detector.redact
          ? redactLine(line, match)
          : line.trim().slice(0, 200),
      });
    }
  }
  return findings;
}

function scanStructure(content: string): NormalisedFinding[] {
  const findings: NormalisedFinding[] = [];
  const fm = parseFrontMatter(content);
  if (!fm.present) return findings;

  const unsupported = fm.keys.filter((k) => !SPEC_FRONT_MATTER_KEYS.has(k));
  if (unsupported.length) {
    findings.push({
      ruleId: "STO-LINT-021",
      severity: severityOf("STO-LINT-021"),
      message: messageOf("STO-LINT-021"),
      path: "SKILL.md",
      evidence: `Unsupported: ${unsupported.join(", ")}`,
    });
  }

  if (fm.name && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fm.name)) {
    findings.push({
      ruleId: "STO-LINT-015",
      severity: severityOf("STO-LINT-015"),
      message: messageOf("STO-LINT-015"),
      path: "SKILL.md",
      evidence: `name: ${fm.name.slice(0, 80)}`,
    });
  }

  return findings;
}

export type PreflightResult = {
  status: "passed" | "failed";
  findings: NormalisedFinding[];
  counts: SeverityCounts;
  /** Retained for the existing `skills.risk_score` column, not shown as a grade. */
  weight: number;
  toolVersion: string;
  policyHash: string;
  durationMs: number;
  bytes: number;
  truncated: boolean;
};

export function runPreflight(content: string): PreflightResult {
  const started = Date.now();
  const bytes = new TextEncoder().encode(content).length;
  const truncated = bytes > MAX_INPUT_BYTES;
  const body = truncated ? content.slice(0, MAX_INPUT_BYTES) : content;

  const findings = [...scanStructure(body), ...scanLines(body)].sort((a, b) => {
    const order: Severity[] = ["critical", "high", "medium", "low"];
    const bySeverity = order.indexOf(a.severity) - order.indexOf(b.severity);
    if (bySeverity !== 0) return bySeverity;
    if (a.ruleId !== b.ruleId) return a.ruleId.localeCompare(b.ruleId);
    return (a.line ?? 0) - (b.line ?? 0);
  });

  const counts = countSeverities(findings);
  const weight = Math.min(
    100,
    counts.critical * 40 + counts.high * 15 + counts.medium * 5 + counts.low * 2,
  );

  return {
    status: findings.length === 0 ? "passed" : "failed",
    findings,
    counts,
    weight,
    toolVersion: PREFLIGHT_VERSION,
    policyHash: PREFLIGHT_POLICY_HASH,
    durationMs: Date.now() - started,
    bytes,
    truncated,
  };
}

export function preflightSummary(result: PreflightResult): string {
  if (result.status === "passed") {
    return "No findings from the SKILL.md preflight subset. Package, lifecycle and privacy rules were not assessed.";
  }
  const parts: string[] = [];
  if (result.counts.critical) parts.push(`${result.counts.critical} critical`);
  if (result.counts.high) parts.push(`${result.counts.high} high`);
  if (result.counts.medium) parts.push(`${result.counts.medium} medium`);
  if (result.counts.low) parts.push(`${result.counts.low} low`);
  return `${result.counts.total} finding${result.counts.total === 1 ? "" : "s"} (${parts.join(" · ")}).`;
}
