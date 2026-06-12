import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('SITE_URL') ?? '*'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

// ── SEACOM Brand (colours sourced from the official logo) ─────────
const BRAND = {
  navy:     '#0b2265',   // primary — deep navy
  blue:     '#0098db',   // SEACOM blue
  sky:      '#8cd1ef',   // light sky accent
  navyDark: '#071740',   // darker shade for footer
  text:     '#1f2937',
  muted:    '#6b7280',
  faint:    '#9ca3af',
  bg:       '#eef2f7',
  cardBg:   '#f8fafc',
  border:   '#e2e8f0',
}

// ── Payload Types ─────────────────────────────────────────────────

interface Approver {
  email: string
  role: string
  step: number
  nextApprover?: string | null
}

interface ApprovalEmailPayload {
  notificationType?: 'approval_request'
  requestId: string
  requestNumber: string
  requestTitle: string
  requestAmount: number
  requestCurrency: string
  requesterName?: string
  requesterEmail: string
  department?: string
  businessUnit?: string
  projectNumber?: string
  requiredByDate?: string
  submittedDate?: string
  description?: string
  doaLevel: string
  daysPending?: number
  previousApprover?: string | null
  totalSteps: number
  approvers: Approver[]
  /** Human-readable request type, e.g. "system access" or "infrastructure change". Defaults to "funding". */
  requestLabel?: string
}

interface StatusUpdatePayload {
  notificationType: 'status_update'
  requestId: string
  requestNumber: string
  requestTitle: string
  requestAmount: number
  requestCurrency: string
  requesterEmail: string
  requesterName?: string
  newStatus: 'approved' | 'rejected' | 'returned'
  approverName?: string
  comments?: string
  approvalStep?: number
  totalSteps?: number
}

// ── Azure Token ───────────────────────────────────────────────────
async function getAzureToken(): Promise<string> {
  const tenantId     = Deno.env.get('AZURE_TENANT_ID')!
  const clientId     = Deno.env.get('AZURE_CLIENT_ID')!
  const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET')!

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         'https://graph.microsoft.com/.default',
      }).toString(),
    }
  )
  if (!res.ok) throw new Error(`Failed to get Azure token: ${await res.text()}`)
  return (await res.json()).access_token
}

// ── Send Email via Graph ──────────────────────────────────────────
async function sendEmail(token: string, to: string, subject: string, htmlBody: string, textBody: string): Promise<void> {
  const senderEmail = Deno.env.get('SENDER_EMAIL')!
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: htmlBody },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    }),
  })
  if (!res.ok) throw new Error(`Graph sendMail failed for ${to}: ${await res.text()}`)
}

// ── HTML Escape ───────────────────────────────────────────────────
function esc(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

function fmtAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount)
}

// ── Shared email shell: SEACOM-branded header/footer ──────────────
// Solid navy header (Outlook-safe — no gradients), SEACOM blue accent bar,
// logo image with styled alt-text fallback for clients that block images.
function emailShell(headerSubtitle: string, bodyRows: string): string {
  const logoUrl = Deno.env.get('LOGO_URL') || 'https://seacom.co.za/_next/static/media/seacom-new-logo.fbd57ebe.svg'
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(11,34,101,0.12);">

        <!-- Header: SEACOM navy with logo -->
        <tr>
          <td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};padding:26px 40px 22px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <img src="${logoUrl}" alt="SEACOM" width="150" height="46"
                    style="display:block;width:150px;height:auto;border:0;
                      color:#ffffff;font-size:24px;font-weight:800;letter-spacing:2px;font-family:'Segoe UI',Arial,sans-serif;" />
                </td>
                <td align="right" style="vertical-align:bottom;">
                  <span style="color:${BRAND.sky};font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
                    Funding Portal
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Blue accent bar -->
        <tr><td bgcolor="${BRAND.blue}" style="background:${BRAND.blue};height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Subtitle strip -->
        <tr>
          <td bgcolor="${BRAND.navyDark}" style="background:${BRAND.navyDark};padding:10px 40px;">
            <span style="color:${BRAND.sky};font-size:13px;font-weight:600;">${headerSubtitle}</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${bodyRows}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};padding:20px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:1px;">SEACOM</p>
                  <p style="margin:0;color:${BRAND.sky};font-size:11px;">Funding &amp; CAPEX Approval Portal</p>
                </td>
                <td align="right" style="vertical-align:bottom;">
                  <a href="https://seacom.com" style="color:${BRAND.sky};font-size:11px;text-decoration:none;">seacom.com</a>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:12px;border-top:1px solid rgba(140,209,239,0.25);">
                  <p style="margin:12px 0 0;color:rgba(255,255,255,0.55);font-size:11px;line-height:1.5;">
                    This is an automated notification from the SEACOM Funding Portal. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}

// Detail row helper for the request-details card
function detailRow(label: string, valueHtml: string): string {
  return `
    <tr>
      <td style="padding:6px 0;color:${BRAND.muted};font-size:13px;width:36%;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;color:#111827;font-size:13px;">${valueHtml}</td>
    </tr>`
}

// CTA button + explicit login link
function ctaSection(url: string, buttonText: string): string {
  return `
    <tr>
      <td align="center" style="padding-bottom:14px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td bgcolor="${BRAND.blue}" style="background:${BRAND.blue};border-radius:8px;">
            <a href="${url}"
              style="display:inline-block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;
                padding:14px 44px;letter-spacing:0.3px;font-family:'Segoe UI',Arial,sans-serif;">
              ${buttonText} →
            </a>
          </td>
        </tr></table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-bottom:8px;">
        <p style="margin:0;color:${BRAND.faint};font-size:12px;line-height:1.6;">
          Button not working? Log in directly at:<br>
          <a href="${url}" style="color:${BRAND.blue};font-size:12px;word-break:break-all;">${url}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td align="center">
        <p style="margin:8px 0 0;color:${BRAND.faint};font-size:12px;">
          Sign in with your <strong style="color:${BRAND.muted};">SEACOM Microsoft (Azure AD)</strong> account.
        </p>
      </td>
    </tr>`
}

// ── Approver Notification Email ───────────────────────────────────
function buildApproverEmailHtml(payload: ApprovalEmailPayload, approver: Approver, approverName: string): string {
  const appUrl      = Deno.env.get('APP_URL') || 'https://requests.seacom.com'
  const approvalUrl = `${appUrl}/approvals`
  const stepNumber  = approver.step
  const totalSteps  = payload.totalSteps
  const daysPending = payload.daysPending ?? 0
  const formattedAmount = fmtAmount(payload.requestAmount, payload.requestCurrency)

  const priorityBanner = daysPending > 3 ? `
      <tr>
        <td style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 16px;color:#dc2626;font-size:13px;font-weight:600;text-align:center;">
          ⏰ This request has been waiting for ${daysPending} day${daysPending === 1 ? '' : 's'} — please action it as soon as possible
        </td>
      </tr>
      <tr><td style="height:16px;"></td></tr>` : ''

  const previousApprovalRow = payload.previousApprover ? `
      <tr>
        <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;">
          <span style="color:#16a34a;font-weight:600;font-size:13px;">✓ Previously Approved</span><br>
          <span style="color:${BRAND.text};font-size:13px;">${esc(payload.previousApprover)} approved this request and passed it to you.</span>
        </td>
      </tr>
      <tr><td style="height:16px;"></td></tr>` : ''

  const progressBar = totalSteps > 1 ? `
      <tr>
        <td style="background:#f0f7ff;border:1px solid ${BRAND.sky};border-radius:6px;padding:14px 16px;">
          <div style="font-size:12px;color:${BRAND.navy};font-weight:700;margin-bottom:8px;">
            Approval Progress — Stage ${stepNumber} of ${totalSteps}
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#dbeafe;border-radius:4px;height:6px;overflow:hidden;">
                <table width="${Math.round((stepNumber / totalSteps) * 100)}%" cellpadding="0" cellspacing="0">
                  <tr><td bgcolor="${BRAND.blue}" style="background:${BRAND.blue};height:6px;border-radius:4px;font-size:0;">&nbsp;</td></tr>
                </table>
              </td>
            </tr>
          </table>
          <div style="font-size:11px;color:${BRAND.muted};margin-top:8px;">
            ${stepNumber < totalSteps
              ? `After your approval, this request goes to: <strong>${esc(approver.nextApprover)}</strong>`
              : 'You are the <strong>final approver</strong> — your approval completes this request.'}
          </div>
        </td>
      </tr>
      <tr><td style="height:20px;"></td></tr>` : ''

  const detailRows = [
    detailRow('Request #', `<span style="font-weight:700;font-family:Consolas,monospace;">${esc(payload.requestNumber)}</span>`),
    detailRow('Title', `<strong>${esc(payload.requestTitle)}</strong>`),
    detailRow('Amount', `<span style="color:${BRAND.navy};font-size:16px;font-weight:800;">${formattedAmount}</span>`),
    payload.projectNumber ? detailRow('Project Number', `<span style="font-family:Consolas,monospace;font-size:12px;">${esc(payload.projectNumber)}</span>`) : '',
    payload.department    ? detailRow('Department', esc(payload.department)) : '',
    payload.businessUnit  ? detailRow('Business Unit', esc(payload.businessUnit)) : '',
    detailRow('Requested by', `${esc(payload.requesterName || payload.requesterEmail)}${payload.requesterName ? ` <span style="color:${BRAND.faint};">&lt;${esc(payload.requesterEmail)}&gt;</span>` : ''}`),
    payload.submittedDate  ? detailRow('Submitted', esc(fmtDate(payload.submittedDate))) : '',
    payload.requiredByDate ? detailRow('Required by', `<strong style="color:#b45309;">${esc(fmtDate(payload.requiredByDate))}</strong>`) : '',
    detailRow('DoA Level', `<span style="background:#e6f4fb;color:${BRAND.navy};font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;">${esc(payload.doaLevel)}</span>`),
    detailRow('Your role', `<span style="background:#f0fdf4;color:#166534;font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;">${esc(approver.role)}</span>`),
  ].join('')

  const bodyRows = `
    ${priorityBanner}
    ${previousApprovalRow}
    ${progressBar}
    <tr>
      <td style="padding-bottom:20px;">
        <p style="margin:0 0 6px;color:${BRAND.text};font-size:15px;">Hi <strong>${esc(approverName)}</strong>,</p>
        <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6;">
          A ${esc(payload.requestLabel ?? 'funding')} request requires your approval as <strong>${esc(approver.role)}</strong>.
          Please review the details below and log in to the portal to approve, return, or reject it.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:${BRAND.cardBg};border:1px solid ${BRAND.border};border-left:4px solid ${BRAND.blue};border-radius:8px;">
          <tr><td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${detailRows}
            </table>
          </td></tr>
        </table>
      </td>
    </tr>
    ${payload.description ? `
    <tr>
      <td style="padding-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="border-left:3px solid ${BRAND.blue};background:${BRAND.cardBg};border-radius:0 6px 6px 0;">
          <tr><td style="padding:14px 16px;">
            <div style="color:${BRAND.blue};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Executive Summary</div>
            <div style="color:${BRAND.text};font-size:13px;line-height:1.6;">${esc(payload.description)}</div>
          </td></tr>
        </table>
      </td>
    </tr>` : ''}
    ${ctaSection(approvalUrl, 'Review & Action Request')}`

  return emailShell(`Stage ${stepNumber} of ${totalSteps} &nbsp;·&nbsp; ⚡ Action Required`, bodyRows)
}

function buildApproverEmailText(payload: ApprovalEmailPayload, approver: Approver, approverName: string): string {
  const appUrl      = Deno.env.get('APP_URL') || 'https://requests.seacom.com'
  const approvalUrl = `${appUrl}/approvals`
  const daysPending = payload.daysPending ?? 0
  return [
    daysPending > 3 ? `⏰ This request has been waiting for ${daysPending} days\n` : '',
    `SEACOM FUNDING PORTAL — ${(payload.requestLabel ?? 'FUNDING').toUpperCase()} APPROVAL REQUIRED (Stage ${approver.step} of ${payload.totalSteps})`,
    '='.repeat(60),
    '',
    `Hi ${approverName},`,
    '',
    `Request #:     ${payload.requestNumber}`,
    `Title:         ${payload.requestTitle}`,
    `Amount:        ${fmtAmount(payload.requestAmount, payload.requestCurrency)}`,
    payload.projectNumber ? `Project #:     ${payload.projectNumber}` : '',
    payload.department    ? `Department:    ${payload.department}` : '',
    payload.businessUnit  ? `Business Unit: ${payload.businessUnit}` : '',
    `Requested by:  ${payload.requesterName || payload.requesterEmail}`,
    payload.submittedDate  ? `Submitted:     ${fmtDate(payload.submittedDate)}` : '',
    payload.requiredByDate ? `Required by:   ${fmtDate(payload.requiredByDate)}` : '',
    payload.previousApprover ? `Prev approval: ${payload.previousApprover}` : '',
    `DoA Level:     ${payload.doaLevel}`,
    `Your role:     ${approver.role}`,
    '',
    payload.description ? `Executive Summary:\n${payload.description}\n` : '',
    approver.step < payload.totalSteps
      ? `After your approval, this request goes to: ${approver.nextApprover}`
      : 'You are the final approver — your approval completes this request.',
    '',
    '---',
    `Log in to review and action: ${approvalUrl}`,
    'Sign in with your SEACOM Microsoft (Azure AD) account.',
    '---',
    '',
    'SEACOM Funding Portal · Automated notification — please do not reply.',
  ].filter(l => l !== '').join('\n')
}

// ── Requester Status-Update Email ─────────────────────────────────
function buildStatusUpdateEmailHtml(payload: StatusUpdatePayload, requesterName: string): string {
  const appUrl     = Deno.env.get('APP_URL') || 'https://requests.seacom.com'
  const requestUrl = `${appUrl}/request/${payload.requestId}`
  const formattedAmount = fmtAmount(payload.requestAmount, payload.requestCurrency)

  const configs = {
    approved: {
      icon: '✅', title: 'Request Approved',
      message: `Your funding request has been fully approved through all ${payload.totalSteps || 1} approval stage(s).`,
      ctaText: 'View Approved Request', accent: '#16a34a',
      bannerBg: '#f0fdf4', bannerBorder: '#bbf7d0', bannerColor: '#166534',
      commentLabel: 'Approval Notes',
    },
    rejected: {
      icon: '❌', title: 'Request Rejected',
      message: `Your funding request was rejected by ${esc(payload.approverName || 'an approver')}. The reason is shown below — you may submit a revised request if applicable.`,
      ctaText: 'View Request Details', accent: '#dc2626',
      bannerBg: '#fef2f2', bannerBorder: '#fecaca', bannerColor: '#991b1b',
      commentLabel: 'Rejection Reason',
    },
    returned: {
      icon: '↩️', title: 'Request Returned for Revision',
      message: `Your funding request was returned by ${esc(payload.approverName || 'an approver')}. Review the feedback below, make corrections, and resubmit.`,
      ctaText: 'Edit &amp; Resubmit', accent: '#d97706',
      bannerBg: '#fffbeb', bannerBorder: '#fed7aa', bannerColor: '#92400e',
      commentLabel: 'Feedback for Revision',
    },
  }
  const cfg = configs[payload.newStatus]

  const detailRows = [
    detailRow('Request #', `<span style="font-weight:700;font-family:Consolas,monospace;">${esc(payload.requestNumber)}</span>`),
    detailRow('Title', `<strong>${esc(payload.requestTitle)}</strong>`),
    detailRow('Amount', `<span style="color:${BRAND.navy};font-size:16px;font-weight:800;">${formattedAmount}</span>`),
    detailRow('Status', `<span style="background:${cfg.bannerBg};color:${cfg.bannerColor};font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;">${payload.newStatus.charAt(0).toUpperCase() + payload.newStatus.slice(1)}</span>`),
    payload.approverName ? detailRow(payload.newStatus === 'approved' ? 'Final Approver' : 'Actioned By', esc(payload.approverName)) : '',
    payload.approvalStep && payload.totalSteps ? detailRow('Stage', `Stage ${payload.approvalStep} of ${payload.totalSteps}`) : '',
  ].join('')

  const bodyRows = `
    <tr>
      <td style="background:${cfg.bannerBg};border:1px solid ${cfg.bannerBorder};border-radius:6px;padding:14px 16px;">
        <div style="color:${cfg.bannerColor};font-weight:700;font-size:14px;margin-bottom:4px;">${cfg.icon} ${cfg.title}</div>
        <div style="color:${BRAND.text};font-size:13px;line-height:1.6;">${cfg.message}</div>
      </td>
    </tr>
    <tr><td style="height:20px;"></td></tr>
    <tr>
      <td style="padding-bottom:20px;">
        <p style="margin:0 0 6px;color:${BRAND.text};font-size:15px;">Hi <strong>${esc(requesterName)}</strong>,</p>
        <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6;">Here is an update on your funding request.</p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:${BRAND.cardBg};border:1px solid ${BRAND.border};border-left:4px solid ${cfg.accent};border-radius:8px;">
          <tr><td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${detailRows}
            </table>
          </td></tr>
        </table>
      </td>
    </tr>
    ${payload.comments ? `
    <tr>
      <td style="padding-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="border-left:3px solid ${cfg.accent};background:${BRAND.cardBg};border-radius:0 6px 6px 0;">
          <tr><td style="padding:14px 16px;">
            <div style="color:${cfg.accent};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${cfg.commentLabel}</div>
            <div style="color:${BRAND.text};font-size:13px;line-height:1.6;">${esc(payload.comments)}</div>
          </td></tr>
        </table>
      </td>
    </tr>` : ''}
    ${ctaSection(requestUrl, cfg.ctaText)}`

  return emailShell(`${cfg.icon} ${cfg.title}`, bodyRows)
}

function buildStatusUpdateEmailText(payload: StatusUpdatePayload, requesterName: string): string {
  const appUrl     = Deno.env.get('APP_URL') || 'https://requests.seacom.com'
  const requestUrl = `${appUrl}/request/${payload.requestId}`
  const statusLabel = { approved: 'APPROVED', rejected: 'REJECTED', returned: 'RETURNED FOR REVISION' }[payload.newStatus]
  return [
    `SEACOM FUNDING PORTAL — REQUEST ${statusLabel}`,
    '='.repeat(60),
    '',
    `Hi ${requesterName},`,
    '',
    `Request #:    ${payload.requestNumber}`,
    `Title:        ${payload.requestTitle}`,
    `Amount:       ${fmtAmount(payload.requestAmount, payload.requestCurrency)}`,
    `Status:       ${statusLabel}`,
    payload.approverName ? `Actioned by:  ${payload.approverName}` : '',
    payload.approvalStep && payload.totalSteps ? `Stage:        ${payload.approvalStep} of ${payload.totalSteps}` : '',
    '',
    payload.comments ? `Notes:\n${payload.comments}\n` : '',
    '---',
    `Log in to view: ${requestUrl}`,
    'Sign in with your SEACOM Microsoft (Azure AD) account.',
    '---',
    '',
    'SEACOM Funding Portal · Automated notification — please do not reply.',
  ].filter(l => l !== '').join('\n')
}

// ── Profile name lookup ───────────────────────────────────────────
async function lookupName(supabaseAdmin: ReturnType<typeof createClient>, email: string | undefined): Promise<string | null> {
  if (!email) return null
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .ilike('email', email)
    .maybeSingle()
  return (data as { full_name?: string } | null)?.full_name || null
}

// ── Main Handler ──────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (allowedOrigin !== '*') {
    const origin = req.headers.get('Origin') ?? ''
    if (origin && origin !== allowedOrigin) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let body: ApprovalEmailPayload | StatusUpdatePayload
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let azureToken: string
  try {
    azureToken = await getAzureToken()
  } catch (err) {
    console.error('Azure token error:', err)
    return new Response(JSON.stringify({ error: 'Azure token error: ' + (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // ── Status Update: notify requester ──────────────────────────────
  if (body.notificationType === 'status_update') {
    const payload = body as StatusUpdatePayload
    const requesterName = (await lookupName(supabaseAdmin, payload.requesterEmail)) || payload.requesterName || payload.requesterEmail

    const statusLabel = { approved: 'Approved ✅', rejected: 'Rejected ❌', returned: 'Returned for Revision ↩️' }[payload.newStatus]
    const subject = `[${payload.requestNumber}] Your Request Has Been ${statusLabel}`
    const html    = buildStatusUpdateEmailHtml(payload, requesterName)
    const text    = buildStatusUpdateEmailText(payload, requesterName)

    try {
      await sendEmail(azureToken, payload.requesterEmail, subject, html, text)
      console.log(`Status update email sent to ${payload.requesterEmail} (${payload.newStatus})`)
      return new Response(JSON.stringify({ sent: [payload.requesterEmail], failed: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (err) {
      console.error(`Failed to send status update to ${payload.requesterEmail}:`, err)
      return new Response(JSON.stringify({ sent: [], failed: [(err as Error).message] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  }

  // ── Approval Request: notify approver(s) ─────────────────────────
  const payload = body as ApprovalEmailPayload

  if (!payload.approvers?.length) {
    return new Response(JSON.stringify({ error: 'No approvers provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Server-side enrichment: pull authoritative request details from the DB
  // so emails are always complete regardless of what the client sent.
  if (payload.requestId) {
    const { data: reqRow } = await supabaseAdmin
      .from('funding_requests')
      .select(`
        request_number, title, amount, currency, description, project_number,
        business_unit, required_by_date, created_at, requester_email, doa_level,
        department:departments(name)
      `)
      .eq('id', payload.requestId)
      .maybeSingle()

    if (reqRow) {
      const r = reqRow as Record<string, unknown>
      payload.requestNumber   ||= r.request_number as string
      payload.requestTitle    ||= r.title as string
      payload.requestAmount   ||= r.amount as number
      payload.requestCurrency ||= r.currency as string
      payload.description     ||= (r.description as string) || undefined
      payload.projectNumber   ||= (r.project_number as string) || undefined
      payload.businessUnit    ||= (r.business_unit as string) || undefined
      payload.requiredByDate  ||= (r.required_by_date as string) || undefined
      payload.submittedDate   ||= (r.created_at as string) || undefined
      payload.requesterEmail  ||= (r.requester_email as string) || ''
      payload.doaLevel        ||= (r.doa_level as string) || ''
      const dept = r.department as { name?: string } | { name?: string }[] | null
      payload.department      ||= (Array.isArray(dept) ? dept[0]?.name : dept?.name) || undefined
      if (payload.daysPending === undefined && r.created_at) {
        payload.daysPending = Math.floor((Date.now() - new Date(r.created_at as string).getTime()) / 86400000)
      }
    }
  }

  // Requester display name
  if (!payload.requesterName) {
    payload.requesterName = (await lookupName(supabaseAdmin, payload.requesterEmail)) || undefined
  }

  const results = await Promise.allSettled(
    payload.approvers.map(async (approver) => {
      // Personalised greeting — fall back to the role title if no profile exists
      const approverName = (await lookupName(supabaseAdmin, approver.email)) || approver.role
      const subject = `Action Required: ${payload.requestNumber} — ${payload.requestTitle} (${fmtAmount(payload.requestAmount, payload.requestCurrency)})`
      const html    = buildApproverEmailHtml(payload, approver, approverName)
      const text    = buildApproverEmailText(payload, approver, approverName)
      await sendEmail(azureToken, approver.email, subject, html, text)
      return approver.email
    })
  )

  const sent   = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<string>).value)
  const failed = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason?.message)

  if (sent.length)   console.log(`Approval emails sent: ${sent.join(', ')}`)
  if (failed.length) console.error(`Failed: ${failed.join(', ')}`)

  return new Response(JSON.stringify({ sent, failed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
