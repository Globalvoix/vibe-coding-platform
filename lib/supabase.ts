import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  public: {
    Tables: {
      apps: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          files: {
            sandboxId?: string
            paths?: string[]
            url?: string
            urlUUID?: string
          } | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description: string
          files?: {
            sandboxId?: string
            paths?: string[]
            url?: string
            urlUUID?: string
          } | null
        }
        Update: {
          name?: string
          description?: string
          files?: {
            sandboxId?: string
            paths?: string[]
            url?: string
            urlUUID?: string
          } | null
          updated_at?: string
        }
      }
    }
  }
}
