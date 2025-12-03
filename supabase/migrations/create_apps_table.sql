-- Create apps table for storing user-created applications
CREATE TABLE IF NOT EXISTS public.apps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  files JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_apps_user_id ON public.apps(user_id);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_apps_updated_at ON public.apps(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to read/write only their own apps
CREATE POLICY "Users can manage their own apps" ON public.apps
  FOR ALL
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- Grant permissions to anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Enable realtime for apps table
ALTER PUBLICATION supabase_realtime ADD TABLE public.apps;
