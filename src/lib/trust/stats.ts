/**
 * Registry counters for the landing page.
 *
 * Every number is read from Neon. There are no seeded or illustrative values:
 * a trust product that fakes its own metrics has nothing left to sell.
 */

import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export type RegistryStats = {
  skillsTotal: number;
  scansCompleted: number;
  /** Skills currently holding a passing decision on their latest scan. */
  passing: number;
  /** Skills whose latest scan matched at least one rule. */
  blocked: number;
  /** Scans that could not produce a reliable result. */
  inconclusive: number;
  /** Findings recorded across all completed scans. */
  findingsRecorded: number;
  /** Distinct rules that have fired at least once in this registry. */
  distinctRules: number;
};

type Row = Record<string, unknown>;

function asRows(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Row[] }).rows ?? [];
  }
  return [];
}

const EMPTY: RegistryStats = {
  skillsTotal: 0,
  scansCompleted: 0,
  passing: 0,
  blocked: 0,
  inconclusive: 0,
  findingsRecorded: 0,
  distinctRules: 0,
};

export async function getRegistryStats(): Promise<RegistryStats> {
  try {
    const db = getDb();
    const rows = asRows(
      await db.execute(sql`
        WITH skill_counts AS (
          SELECT
            count(*)::int AS skills_total,
            count(*) FILTER (WHERE status = 'passed')::int AS passing,
            count(*) FILTER (WHERE status IN ('failed', 'flagged'))::int AS blocked,
            count(*) FILTER (WHERE status = 'error')::int AS inconclusive
          FROM skills
        ),
        scan_counts AS (
          SELECT
            count(*)::int AS scans_completed,
            coalesce(sum(
              CASE
                WHEN jsonb_typeof(findings -> 'items') = 'array'
                THEN jsonb_array_length(findings -> 'items')
                ELSE 0
              END
            ), 0)::int AS findings_recorded
          FROM scans
          WHERE completed_at IS NOT NULL
        ),
        rule_counts AS (
          SELECT count(DISTINCT item ->> 'rule')::int AS distinct_rules
          FROM scans,
            LATERAL jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(findings -> 'items') = 'array'
                THEN findings -> 'items'
                ELSE '[]'::jsonb
              END
            ) AS item
          WHERE item ->> 'rule' IS NOT NULL
        )
        SELECT * FROM skill_counts, scan_counts, rule_counts
      `),
    );

    const row = rows[0];
    if (!row) return EMPTY;

    return {
      skillsTotal: Number(row.skills_total ?? 0),
      scansCompleted: Number(row.scans_completed ?? 0),
      passing: Number(row.passing ?? 0),
      blocked: Number(row.blocked ?? 0),
      inconclusive: Number(row.inconclusive ?? 0),
      findingsRecorded: Number(row.findings_recorded ?? 0),
      distinctRules: Number(row.distinct_rules ?? 0),
    };
  } catch {
    // The landing page must render even when the database is unreachable.
    return EMPTY;
  }
}
