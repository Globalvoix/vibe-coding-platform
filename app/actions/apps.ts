'use server'

import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type App = Database['public']['Tables']['apps']['Row']

export async function createAppAction(
  name: string,
  description: string
): Promise<App | null> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('apps')
    .insert({
      user_id: userId,
      name,
      description,
      files: null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating app:', error)
    throw new Error('Failed to create app')
  }

  return data
}

export async function getAppsAction(): Promise<App[]> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('apps')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching apps:', error)
    throw new Error('Failed to fetch apps')
  }

  return data || []
}

export async function getRecentAppsAction(limit: number = 5): Promise<App[]> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('apps')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent apps:', error)
    throw new Error('Failed to fetch recent apps')
  }

  return data || []
}

export async function updateAppAction(
  id: string,
  updates: {
    name?: string
    description?: string
    files?: {
      sandboxId?: string
      paths?: string[]
      url?: string
      urlUUID?: string
    } | null
  }
): Promise<App | null> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('apps')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating app:', error)
    throw new Error('Failed to update app')
  }

  return data
}

export async function deleteAppAction(id: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('apps')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting app:', error)
    throw new Error('Failed to delete app')
  }
}

export async function renameAppAction(id: string, newName: string): Promise<App | null> {
  return updateAppAction(id, { name: newName })
}

export async function updateAppDescriptionAction(
  id: string,
  description: string
): Promise<App | null> {
  return updateAppAction(id, { description })
}

export async function saveAppStateAction(
  id: string,
  files: {
    sandboxId?: string
    paths?: string[]
    url?: string
    urlUUID?: string
  }
): Promise<App | null> {
  return updateAppAction(id, { files })
}
