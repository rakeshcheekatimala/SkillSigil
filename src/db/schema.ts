import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    githubId: text("github_id").notNull(),
    username: text("username").notNull(),
    avatarUrl: text("avatar_url"),
    email: text("email"),
    accessToken: text("access_token"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("users_github_id_uidx").on(t.githubId)],
);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id),
    repoOwner: text("repo_owner").notNull(),
    repoName: text("repo_name").notNull(),
    ref: text("ref").notNull().default("main"),
    subpath: text("subpath").notNull().default(""),
    commitSha: text("commit_sha").notNull().default(""),
    category: text("category").notNull().default("Productivity"),
    tags: text("tags").array().notNull().default([]),
    status: text("status").notNull().default("pending_scan"),
    riskScore: integer("risk_score").notNull().default(0),
    latestScanId: uuid("latest_scan_id"),
    upvoteCount: integer("upvote_count").notNull().default(0),
    downloadCount: integer("download_count").notNull().default(0),
    searchVector: tsvector("search_vector"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("skills_slug_uidx").on(t.slug),
    index("skills_status_idx").on(t.status),
    index("skills_category_idx").on(t.category),
    index("skills_search_gin").using("gin", t.searchVector),
  ],
);

export const scans = pgTable(
  "scans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    commitSha: text("commit_sha").notNull().default(""),
    status: text("status").notNull().default("queued"),
    score: integer("score").notNull().default(0),
    findings: jsonb("findings").notNull().default({}),
    toolVersion: text("tool_version"),
    policyHash: text("policy_hash"),
    durationMs: integer("duration_ms"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("scans_skill_id_idx").on(t.skillId)],
);

export const upvotes = pgTable(
  "upvotes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] })],
);

export const downloadEvents = pgTable(
  "download_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("download_events_skill_id_idx").on(t.skillId)],
);

export const repoVerifications = pgTable(
  "repo_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    repoOwner: text("repo_owner").notNull(),
    repoName: text("repo_name").notNull(),
    permissionLevel: text("permission_level").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("repo_verifications_uidx").on(
      t.userId,
      t.repoOwner,
      t.repoName,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type SkillRow = typeof skills.$inferSelect;
export type ScanRow = typeof scans.$inferSelect;

export const searchVectorSql = sql`setweight(to_tsvector('english', coalesce(${skills.name}, '')), 'A') || setweight(to_tsvector('english', coalesce(${skills.description}, '')), 'B') || setweight(to_tsvector('english', coalesce(array_to_string(${skills.tags}, ' '), '')), 'C')`;
