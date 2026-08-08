-- Additive migration for the logged-in feature set.
-- Safe on the existing Neon database (does not drop or recreate tables).

ALTER TABLE skills ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS upstream_sha text NOT NULL DEFAULT '';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS last_checked_at timestamp with time zone;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS regressed_at timestamp with time zone;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS star_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS skills_visibility_idx ON skills USING btree (visibility);
CREATE INDEX IF NOT EXISTS skills_owner_idx ON skills USING btree (owner_user_id);

CREATE TABLE IF NOT EXISTS stars (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT stars_user_id_skill_id_pk PRIMARY KEY (user_id, skill_id)
);
CREATE INDEX IF NOT EXISTS stars_user_idx ON stars USING btree (user_id);

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text DEFAULT '' NOT NULL,
  is_public boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS collections_user_slug_uidx ON collections USING btree (user_id, slug);

CREATE TABLE IF NOT EXISTS collection_items (
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  position integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT collection_items_collection_id_skill_id_pk PRIMARY KEY (collection_id, skill_id)
);

CREATE TABLE IF NOT EXISTS skill_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  kind text NOT NULL,
  from_status text,
  to_status text,
  from_commit_sha text,
  to_commit_sha text,
  scan_id uuid,
  detail jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS skill_events_skill_idx ON skill_events USING btree (skill_id);
CREATE INDEX IF NOT EXISTS skill_events_kind_idx ON skill_events USING btree (kind);
CREATE INDEX IF NOT EXISTS skill_events_created_idx ON skill_events USING btree (created_at);

CREATE TABLE IF NOT EXISTS provenance_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  scan_id uuid,
  commit_sha text DEFAULT '' NOT NULL,
  method text NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  subject_digest text,
  oidc_issuer text,
  workflow_repository text,
  workflow_ref text,
  workflow_sha text,
  repository_matches boolean DEFAULT false NOT NULL,
  rekor_log_index text,
  error text,
  verified_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS provenance_skill_idx ON provenance_attestations USING btree (skill_id);
CREATE UNIQUE INDEX IF NOT EXISTS provenance_skill_commit_method_uidx
  ON provenance_attestations USING btree (skill_id, commit_sha, method);

CREATE TABLE IF NOT EXISTS publisher_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  value text NOT NULL,
  method text NOT NULL,
  evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
  verified_at timestamp with time zone DEFAULT now() NOT NULL,
  revoked_at timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS publisher_verifications_uidx
  ON publisher_verifications USING btree (user_id, kind, value);
CREATE INDEX IF NOT EXISTS publisher_verifications_value_idx
  ON publisher_verifications USING btree (kind, value);
