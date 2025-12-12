ALTER TABLE supabase_connections
  ADD COLUMN IF NOT EXISTS supabase_project_ref TEXT,
  ADD COLUMN IF NOT EXISTS supabase_org_id TEXT,
  ADD COLUMN IF NOT EXISTS supabase_project_name TEXT;

CREATE INDEX IF NOT EXISTS supabase_connections_project_ref_idx 
  ON supabase_connections(supabase_project_ref);
