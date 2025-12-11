/**
 * Supabase Storage Setup Guide
 * 
 * To enable image upload functionality for chat, you need to create a storage bucket in Supabase.
 * 
 * Steps:
 * 1. Go to your Supabase project dashboard (https://app.supabase.com)
 * 2. Navigate to Storage > Buckets
 * 3. Click "Create a new bucket"
 * 4. Name it: "chat-images"
 * 5. Make it Public (enable public access)
 * 6. Click "Create bucket"
 * 
 * Optional: Set up storage policies for fine-grained access control:
 * - Go to Storage > Policies
 * - For INSERT: Allow authenticated users to upload
 * - For SELECT: Allow public access to read
 * - For DELETE: Allow users to delete their own files
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
}

/**
 * Server-side function to initialize storage bucket
 * This requires SUPABASE_SERVICE_ROLE_KEY to be set
 */
export async function initializeStorageBucket() {
  if (!supabaseServiceKey) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Storage bucket must be created manually in Supabase console.'
    )
    return false
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const bucketName = 'chat-images'

  try {
    // Check if bucket already exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === bucketName)

    if (bucketExists) {
      console.log(`Bucket "${bucketName}" already exists`)
      return true
    }

    // Try to create the bucket
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    })

    if (error) {
      console.error(`Failed to create bucket: ${error.message}`)
      return false
    }

    console.log(`Created storage bucket "${bucketName}" successfully`)
    return true
  } catch (error) {
    console.error('Error initializing storage bucket:', error)
    return false
  }
}
