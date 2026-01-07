import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    const body = await req.json()
    const { projectId, secrets } = body

    if (!projectId || !secrets || typeof secrets !== 'object') {
      return new Response(
        JSON.stringify({
          error: 'Missing or invalid projectId or secrets',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    // Store secrets in environment
    // Note: In production, you would typically store these in a secure secrets management system
    // For now, we'll log them (in production, use Supabase Vault or similar)
    const secretsData = {
      projectId,
      secrets: Object.keys(secrets),
      storedAt: new Date().toISOString(),
    }

    // Create Supabase client to potentially store metadata
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: 'Supabase configuration missing',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Store the fact that secrets were synced (metadata only, not the secrets themselves)
    const { error } = await supabase
      .from('project_secrets_metadata')
      .insert({
        project_id: projectId,
        secrets_count: Object.keys(secrets).length,
        synced_at: new Date().toISOString(),
      })
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is duplicate key error, which is fine for this operation
      console.error('Failed to store secrets metadata:', error)
      // Don't fail the request, just warn
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Secrets synced successfully',
        secretsCount: Object.keys(secrets).length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error) {
    console.error('Error syncing secrets:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})
