import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration is missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const BUCKET_NAME = 'chat-images'
let bucketCheckDone = false

async function ensureBucket() {
  if (bucketCheckDone) return

  try {
    // Try to access the bucket
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.warn('Could not verify bucket, proceeding with upload anyway', listError)
      return
    }

    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME)

    if (!bucketExists) {
      // Bucket doesn't exist - this will be handled by server-side initialization
      console.warn(`Storage bucket "${BUCKET_NAME}" does not exist. Please create it in Supabase console.`)
    }
  } catch (error) {
    console.warn('Bucket check failed, proceeding with upload', error)
  } finally {
    bucketCheckDone = true
  }
}

export async function uploadImageToSupabase(
  file: File,
  userId: string
): Promise<string> {
  await ensureBucket()

  const timestamp = Date.now()
  const filename = `${userId}/${timestamp}-${file.name}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path)

  return publicUrl
}

export async function deleteImageFromSupabase(imageUrl: string): Promise<void> {
  const urlParts = imageUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`)
  if (urlParts.length !== 2) {
    return
  }
  const filepath = urlParts[1]

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filepath])

  if (error) {
    console.warn(`Failed to delete image: ${error.message}`)
  }
}
