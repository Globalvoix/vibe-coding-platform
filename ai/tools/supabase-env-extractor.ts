import { getSupabaseProject } from '@/lib/supabase-projects-db'

/**
 * Extract Supabase environment variables from a connected Supabase project
 * Returns env vars ready to be included in generated code
 */
export async function extractSupabaseEnvVars(
  userId: string,
  projectId: string
): Promise<Record<string, string> | null> {
  try {
    const supabaseProject = await getSupabaseProject(userId, projectId)

    if (!supabaseProject || !supabaseProject.anon_key) {
      return null
    }

    // Build the Supabase URL from the project reference
    const supabaseUrl = `https://${supabaseProject.supabase_project_ref}.supabase.co`

    return {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseProject.anon_key,
    }
  } catch (error) {
    console.warn('Failed to extract Supabase env vars:', error)
    return null
  }
}

/**
 * Generate Supabase client initialization code
 * Returns TypeScript code that can be included in generated projects
 */
export function generateSupabaseClientCode(): string {
  return `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
`
}

/**
 * Generate .env.local template with Supabase credentials
 * Includes placeholders for user to fill in their actual values
 */
export function generateSupabaseEnvTemplate(
  supabaseUrl?: string,
  supabaseAnonKey?: string
): string {
  return `# Supabase Environment Variables
# These are extracted from your connected Supabase project
${supabaseUrl ? `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}` : `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`}
${supabaseAnonKey ? `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}` : `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
`
}

/**
 * Get a description of what Supabase is connected
 */
export function getSupabaseConnectionSummary(
  projectName?: string,
  projectRef?: string,
  supabaseUrl?: string
): string {
  return `✓ Supabase Connected\n  Project: ${projectName || 'Unknown'}\n  Ref: ${projectRef || 'Unknown'}\n  URL: ${supabaseUrl || 'Not available'}`
}
