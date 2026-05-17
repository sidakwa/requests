import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// These secrets are now stored in Supabase secrets
const AZURE_TENANT_ID = Deno.env.get('AZURE_TENANT_ID')
const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID')
const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET')

serve(async (req) => {
  try {
    // Log for debugging
    console.log('Function called with action:', await req.clone().json().then(d => d.action).catch(() => 'unknown'))
    
    const { action } = await req.json()
    
    // Check if Azure AD is configured
    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ 
          error: 'Azure AD not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in Supabase secrets.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Get access token from Azure AD
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    })
    
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    
    if (!accessToken) {
      console.error('Token error:', tokenData)
      return new Response(
        JSON.stringify({ error: 'Failed to get Azure AD token. Check your client secret.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'test') {
      // Test Graph API connection
      const testResponse = await fetch('https://graph.microsoft.com/v1.0/organization', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      
      if (testResponse.ok) {
        const orgData = await testResponse.json()
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Connected to Azure AD for ${orgData.value[0]?.displayName || 'your organization'}` 
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ success: false, message: 'Graph API test failed' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
    
    if (action === 'sync') {
      // Fetch users from Azure AD
      const usersResponse = await fetch(
        'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,department,jobTitle&$top=999',
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
      
      const usersData = await usersResponse.json()
      
      if (usersData.error) {
        throw new Error(usersData.error.message)
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          users: usersData.value || [],
          count: usersData.value?.length || 0 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ error: 'Unknown action. Use "test" or "sync"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
