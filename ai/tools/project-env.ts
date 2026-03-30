import { Sandbox } from 'e2b'
import { getSupabaseProject } from '@/lib/supabase-projects-db'
import { generateSupabaseEnvFile } from '@/lib/supabase-db'

interface Params {
  sandbox: Sandbox
  userId: string
  projectId: string
}

export async function syncProjectEnvToSandbox({
  sandbox,
  userId,
  projectId,
}: Params): Promise<void> {
  try {
    const connection = await getSupabaseProject(userId, projectId)

    if (!connection) {
      return
    }

    const envContent = generateSupabaseEnvFile({
      projectRef: connection.supabase_project_ref,
      anonKey: connection.anon_key || undefined,
    })

    await sandbox.files.write('.env.local', envContent)
  } catch (error) {
    console.error('Failed to sync project env to sandbox:', error)
    throw error
  }
}
