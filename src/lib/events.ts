import { getDb } from "@/db";
import { skillEvents } from "@/db/schema";

export type SkillEventKind =
  | "draft_created"
  | "scan_completed"
  | "admitted"
  | "rescan"
  | "regressed"
  | "visibility_changed";

export async function recordSkillEvent(input: {
  skillId: string;
  kind: SkillEventKind;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromCommitSha?: string | null;
  toCommitSha?: string | null;
  scanId?: string | null;
  detail?: Record<string, unknown>;
}) {
  const db = getDb();
  const [row] = await db
    .insert(skillEvents)
    .values({
      skillId: input.skillId,
      kind: input.kind,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      fromCommitSha: input.fromCommitSha ?? null,
      toCommitSha: input.toCommitSha ?? null,
      scanId: input.scanId ?? null,
      detail: input.detail ?? {},
    })
    .returning();
  return row;
}

export async function latestAdmission(skillId: string) {
  const db = getDb();
  const { desc, eq, and } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(skillEvents)
    .where(and(eq(skillEvents.skillId, skillId), eq(skillEvents.kind, "admitted")))
    .orderBy(desc(skillEvents.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
