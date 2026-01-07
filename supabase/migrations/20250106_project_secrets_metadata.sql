-- Create table to track synced secrets metadata
CREATE TABLE IF NOT EXISTS project_secrets_metadata (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  secrets_count INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, synced_at),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS project_secrets_metadata_project_id_idx ON project_secrets_metadata(project_id);
CREATE INDEX IF NOT EXISTS project_secrets_metadata_synced_at_idx ON project_secrets_metadata(synced_at DESC);
