import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration is missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function uploadImageToSupabase(
  file: File,
  userId: string
): Promise<string> {
  const timestamp = Date.now()
  const filename = `${userId}/${timestamp}-${file.name}`
  const bucketName = 'chat-images'

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucketName).getPublicUrl(data.path)

  return publicUrl
}

export async function deleteImageFromSupabase(imageUrl: string): Promise<void> {
  const bucketName = 'chat-images'
  const urlParts = imageUrl.split('/storage/v1/object/public/chat-images/')
  if (urlParts.length !== 2) {
    return
  }
  const filepath = urlParts[1]

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filepath])

  if (error) {
    console.warn(`Failed to delete image: ${error.message}`)
  }
}
