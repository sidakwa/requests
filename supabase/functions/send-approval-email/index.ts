import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

interface ApprovalEmailPayload {
  requestId: string
  requestNumber: string
  requestTitle: string
  requestAmount: number
  requestCurrency: string
  requesterEmail: string
  doaLevel: string
  approvers: {
    email: string
    role: string
    step: number
  }[]
}

// ── Get Azure access token via client credentials ─────────────────
async function getAzureToken(): Promise<string> {
  const tenantId  = Deno.env.get('AZURE_TENANT_ID')!
  const clientId  = Deno.env.get('AZURE_CLIENT_ID')!
  const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET')!

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientId,
    client_secret: clientSecret,
    scope:         'https://graph.microsoft.com/.default',
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to get Azure token: ${err}`)
  }

  const data = await res.json()
  return data.access_token
}

// ── Send email via Microsoft Graph ────────────────────────────────
async function sendEmail(
  token: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const senderEmail = Deno.env.get('SENDER_EMAIL')!

  const message = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlBody,
      },
      toRecipients: [
        { emailAddress: { address: to } }
      ],
    },
    saveToSentItems: false,
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph sendMail failed for ${to}: ${err}`)
  }
}

// ── HTML escape to prevent XSS in email body ─────────────────────
function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Email HTML template ───────────────────────────────────────────
function buildEmailHtml(payload: ApprovalEmailPayload, approverRole: string): string {
  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
  const approvalUrl = `${appUrl}/approvals`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
                SEACOM Funding Portal
              </h1>
              <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">
                Approval Required
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;color:#374151;font-size:15px;">
                Hi <strong>${approverRole}</strong>,
              </p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
                A new funding request has been submitted and requires your approval.
                Please review the details below and take action.
              </p>

              <!-- Request details card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;width:40%;">Request Number</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;font-family:monospace;">
                          ${escHtml(payload.requestNumber)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Title</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">
                          ${escHtml(payload.requestTitle)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Amount</td>
                        <td style="padding:6px 0;color:#1d4ed8;font-size:15px;font-weight:700;">
                          ${escHtml(payload.requestCurrency)} ${payload.requestAmount.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Submitted by</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;">
                          ${escHtml(payload.requesterEmail)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">DoA Level</td>
                        <td style="padding:6px 0;">
                          <span style="background:#dbeafe;color:#1e40af;font-size:12px;font-weight:600;
                            padding:2px 10px;border-radius:999px;">
                            ${escHtml(payload.doaLevel)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Your role</td>
                        <td style="padding:6px 0;">
                          <span style="background:#f0fdf4;color:#166534;font-size:12px;font-weight:600;
                            padding:2px 10px;border-radius:999px;">
                            ${escHtml(approverRole)}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${approvalUrl}"
                      style="display:inline-block;background:linear-gradient(135deg,#1e40af,#2563eb);
                        color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;
                        padding:14px 40px;border-radius:8px;letter-spacing:0.3px;">
                      Review &amp; Action Request →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                You're receiving this because you are listed as an approver for this request.<br>
                Log in with your SEACOM Azure AD credentials to action this request.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                SEACOM Funding Portal &nbsp;·&nbsp; This is an automated notification.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// ── Main handler ──────────────────────────────────────────────────
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Require a valid Supabase session JWT — prevents unauthenticated callers from
  // triggering arbitrary emails via the publicly-accessible function URL.
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let payload: ApprovalEmailPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!payload.approvers || payload.approvers.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No approvers provided' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Get Azure token once, reuse for all emails
  let azureToken: string
  try {
    azureToken = await getAzureToken()
  } catch (err) {
    console.error('Azure token error:', err)
    return new Response(
      JSON.stringify({ error: 'Azure token error: ' + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const results = await Promise.allSettled(
      payload.approvers.map(async (approver) => {
        const subject = `[Action Required] ${payload.requestNumber} — ${payload.requestTitle}`
        const html = buildEmailHtml(payload, approver.role)
        await sendEmail(azureToken, approver.email, subject, html)
        return approver.email
      })
    )

    const sent   = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<string>).value)
    const failed = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason?.message)

    console.log(`Emails sent: ${sent.join(', ')}`)
    if (failed.length) console.error(`Failed: ${failed.join(', ')}`)

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Send email error:', err)
    return new Response(
      JSON.stringify({ error: 'Send email error: ' + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
