import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify caller is authenticated
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Verify caller's session and check they are an admin
  const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

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
    // Fetch all auth users (paginated — Supabase returns max 1000 per page)
    const authUsers: any[] = []
    let page = 1
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      authUsers.push(...data.users)
      if (data.users.length < 1000) break
      page++
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, department, business_unit')

    if (profilesError) throw profilesError

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

    // Merge: every auth user gets a combined record
    const merged = authUsers.map((u) => {
      const profile = profileMap.get(u.id) || {}
      return {
        id: u.id,
        email: u.email ?? null,
        full_name: u.user_metadata?.full_name ?? null,
        role: profile.role ?? null,
        department: profile.department ?? null,
        business_unit: profile.business_unit ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at ?? null,
      }
    })

    // Sort: most recently active first
    merged.sort((a, b) => {
      const aTime = a.last_sign_in_at ?? a.created_at ?? ''
      const bTime = b.last_sign_in_at ?? b.created_at ?? ''
      return bTime.localeCompare(aTime)
    })

    return new Response(JSON.stringify({ users: merged }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
