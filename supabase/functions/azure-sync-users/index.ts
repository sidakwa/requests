import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const AZURE_TENANT_ID = Deno.env.get('AZURE_TENANT_ID')
const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID')
const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Require a valid JWT
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Verify identity
  const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Require admin role
  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle()

  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { action } = await req.json()

    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({
          error: 'Azure AD not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in Supabase secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get access token from Azure AD
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: AZURE_CLIENT_ID,
          client_secret: AZURE_CLIENT_SECRET,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      }
    )

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error('Token error:', tokenData)
      return new Response(
        JSON.stringify({ error: 'Failed to get Azure AD token. Check your client secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'test') {
      const testResponse = await fetch('https://graph.microsoft.com/v1.0/organization', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (testResponse.ok) {
        const orgData = await testResponse.json()
        return new Response(
          JSON.stringify({
            success: true,
            message: `Connected to Azure AD for ${orgData.value[0]?.displayName || 'your organization'}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ success: false, message: 'Graph API test failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'sync') {
      const usersResponse = await fetch(
        'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,department,jobTitle&$top=999',
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )

      const usersData = await usersResponse.json()

      if (usersData.error) {
        throw new Error(usersData.error.message)
      }

      const azureUsers: any[] = usersData.value || []

      let syncedCount = 0
      for (const user of azureUsers) {
        const { error: upsertError } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.mail || user.userPrincipalName,
              full_name: user.displayName,
              department: user.department ?? null,
              azure_ad_id: user.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )

        if (!upsertError) syncedCount++
      }

      return new Response(
        JSON.stringify({ success: true, usersSynced: syncedCount, count: azureUsers.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action. Use "test" or "sync"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
