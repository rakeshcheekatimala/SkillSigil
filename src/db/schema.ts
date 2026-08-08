import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
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
    /**
     * `draft` keeps a skill out of every public surface so a publisher can scan
     * and iterate before anything is discoverable. Promotion to `public` is an
     * explicit action.
     */
    visibility: text("visibility").notNull().default("public"),
    riskScore: integer("risk_score").notNull().default(0),
    latestScanId: uuid("latest_scan_id"),
    /** Upstream HEAD observed by the last rescan, used to detect rug pulls. */
    upstreamSha: text("upstream_sha").notNull().default(""),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    /** Set when a rescan moved this skill from passing to a worse decision. */
    regressedAt: timestamp("regressed_at", { withTimezone: true }),
    upvoteCount: integer("upvote_count").notNull().default(0),
    starCount: integer("star_count").notNull().default(0),
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
    index("skills_visibility_idx").on(t.visibility),
    index("skills_owner_idx").on(t.ownerUserId),
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

export const stars = pgTable(
  "stars",
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
  (t) => [
    primaryKey({ columns: [t.userId, t.skillId] }),
    index("stars_user_idx").on(t.userId),
  ],
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("collections_user_slug_uidx").on(t.userId, t.slug)],
);

export const collectionItems = pgTable(
  "collection_items",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.skillId] })],
);

/**
 * Append-only decision history. This is what makes a rug pull visible: a skill
 * that passed at install time and regressed later leaves a row here, so the
 * change is auditable rather than silently overwritten on the skill.
 */
export const skillEvents = pgTable(
  "skill_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    fromCommitSha: text("from_commit_sha"),
    toCommitSha: text("to_commit_sha"),
    scanId: uuid("scan_id"),
    detail: jsonb("detail").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("skill_events_skill_idx").on(t.skillId),
    index("skill_events_kind_idx").on(t.kind),
    index("skill_events_created_idx").on(t.createdAt),
  ],
);

/**
 * Sigstore provenance for one scanned commit.
 *
 * Verification is performed by the scan workflow (cosign / gh attestation),
 * never in the Worker. `verified` false with a populated `error` means the
 * bundle was present but did not verify — which is a stronger negative signal
 * than no bundle at all, so the two states are stored distinctly.
 */
export const provenanceAttestations = pgTable(
  "provenance_attestations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    scanId: uuid("scan_id"),
    commitSha: text("commit_sha").notNull().default(""),
    /** `cosign-bundle` or `gh-attestation`. */
    method: text("method").notNull(),
    verified: boolean("verified").notNull().default(false),
    subjectDigest: text("subject_digest"),
    oidcIssuer: text("oidc_issuer"),
    workflowRepository: text("workflow_repository"),
    workflowRef: text("workflow_ref"),
    workflowSha: text("workflow_sha"),
    /** True when workflowRepository matches the skill's own source repo. */
    repositoryMatches: boolean("repository_matches").notNull().default(false),
    rekorLogIndex: text("rekor_log_index"),
    error: text("error"),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("provenance_skill_idx").on(t.skillId),
    uniqueIndex("provenance_skill_commit_method_uidx").on(
      t.skillId,
      t.commitSha,
      t.method,
    ),
  ],
);

/**
 * Publisher identity claims. `repo_verifications` records push access to one
 * repository; this records the broader identity shown on a listing.
 */
export const publisherVerifications = pgTable(
  "publisher_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** `github_user`, `github_org`, or `domain`. */
    kind: text("kind").notNull(),
    value: text("value").notNull(),
    /** How the claim was established, e.g. `oauth_membership`, `dns_txt`. */
    method: text("method").notNull(),
    evidence: jsonb("evidence").notNull().default({}),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("publisher_verifications_uidx").on(t.userId, t.kind, t.value),
    index("publisher_verifications_value_idx").on(t.kind, t.value),
  ],
);

export type User = typeof users.$inferSelect;
export type SkillRow = typeof skills.$inferSelect;
export type ScanRow = typeof scans.$inferSelect;
export type SkillEventRow = typeof skillEvents.$inferSelect;
export type ProvenanceRow = typeof provenanceAttestations.$inferSelect;
export type PublisherVerificationRow =
  typeof publisherVerifications.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;

export const searchVectorSql = sql`setweight(to_tsvector('english', coalesce(${skills.name}, '')), 'A') || setweight(to_tsvector('english', coalesce(${skills.description}, '')), 'B') || setweight(to_tsvector('english', coalesce(array_to_string(${skills.tags}, ' '), '')), 'C')`;
