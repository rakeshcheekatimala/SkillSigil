import { sql } from "drizzle-orm";
import { getDb } from "@/db";

type Row = Record<string, unknown>;

function asRows(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Row[] }).rows ?? [];
  }
  return [];
}

export async function upvoteSkill(userId: string, skillId: string) {
  const db = getDb();
  const updated = asRows(
    await db.execute(sql`
      WITH ins AS (
        INSERT INTO upvotes (user_id, skill_id)
        VALUES (${userId}::uuid, ${skillId}::uuid)
        ON CONFLICT (user_id, skill_id) DO NOTHING
        RETURNING skill_id
      )
      UPDATE skills
      SET upvote_count = upvote_count + 1, updated_at = now()
      WHERE id = (SELECT skill_id FROM ins)
      RETURNING upvote_count
    `),
  );

  if (updated[0]?.upvote_count != null) {
    return {
      upvoted: true,
      count: Number(updated[0].upvote_count),
      idempotent: false,
    };
  }

  const current = asRows(
    await db.execute(sql`
      SELECT upvote_count FROM skills WHERE id = ${skillId}::uuid
    `),
  );
  return {
    upvoted: true,
    count: Number(current[0]?.upvote_count ?? 0),
    idempotent: true,
  };
}

export async function removeUpvote(userId: string, skillId: string) {
  const db = getDb();
  const updated = asRows(
    await db.execute(sql`
      WITH del AS (
        DELETE FROM upvotes
        WHERE user_id = ${userId}::uuid AND skill_id = ${skillId}::uuid
        RETURNING skill_id
      )
      UPDATE skills
      SET upvote_count = GREATEST(upvote_count - 1, 0), updated_at = now()
      WHERE id = (SELECT skill_id FROM del)
      RETURNING upvote_count
    `),
  );

  if (updated[0]?.upvote_count != null) {
    return { upvoted: false, count: Number(updated[0].upvote_count) };
  }

  const current = asRows(
    await db.execute(sql`
      SELECT upvote_count FROM skills WHERE id = ${skillId}::uuid
    `),
  );
  return {
    upvoted: false,
    count: Number(current[0]?.upvote_count ?? 0),
  };
}

export async function hasUpvoted(userId: string, skillId: string) {
  const db = getDb();
  const rows = asRows(
    await db.execute(sql`
      SELECT EXISTS(
        SELECT 1 FROM upvotes
        WHERE user_id = ${userId}::uuid AND skill_id = ${skillId}::uuid
      ) AS exists
    `),
  );
  return Boolean(rows[0]?.exists);
}
