/**
 * Publish-time fallback used when the SkillTrustOps Actions workflow is not
 * wired. It delegates to the same preflight engine that backs the public scan
 * tool, so a publisher cannot get a different answer from the two surfaces.
 */

import { preflightSummary, runPreflight } from "@/lib/scan/preflight";
import type { NormalisedFinding } from "@/lib/trust/decision";

export type LocalFinding = {
  rule: string;
  severity: NormalisedFinding["severity"];
  message: string;
  line?: number;
  path?: string;
  evidence?: string;
};

export type LocalScanResult = {
  status: "passed" | "failed";
  score: number;
  summary: string;
  findings: LocalFinding[];
  toolVersion: string;
  policyHash: string;
  durationMs: number;
};

export function localStaticScan(content: string): LocalScanResult {
  const result = runPreflight(content);

  return {
    status: result.status,
    score: result.weight,
    summary: preflightSummary(result),
    findings: result.findings.map((f) => ({
      rule: f.ruleId,
      severity: f.severity,
      message: f.message,
      line: f.line,
      path: f.path,
      evidence: f.evidence,
    })),
    toolVersion: result.toolVersion,
    policyHash: result.policyHash,
    durationMs: result.durationMs,
  };
}
