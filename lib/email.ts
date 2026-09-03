import 'server-only'

const RESEND_API = 'https://api.resend.com/emails'

function appUrl() { return process.env.NEXT_PUBLIC_APP_URL || 'https://drop.minimical.online' }
function fromAddress() { return process.env.RESEND_FROM_EMAIL || 'MINIMICAL DROP <drop@minimical.online>' }

export function emailConfigured() { return !!process.env.RESEND_API_KEY }

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

export async function sendDropEmail(to: string, subject: string, title: string, body: string, actionUrl?: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: false, skipped: true }
  const safeBody = escapeHtml(body).replace(/\n/g, '<br />')
  const action = actionUrl ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:11px 16px;background:#7650ad;color:#fff;text-decoration:none;border-radius:6px;font:600 13px Arial,sans-serif">Open MINIMICAL DROP</a></p>` : ''
  const html = `<div style="background:#08070c;color:#f7f5fa;padding:40px 24px;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto"><div style="font-size:13px;font-weight:700;letter-spacing:.14em">MINIMICAL <span style="color:#b79be4">DROP</span></div><div style="height:1px;background:#27222e;margin:22px 0 30px"></div><div style="font-size:10px;letter-spacing:.16em;color:#a98bce">PROJECT DELIVERY</div><h1 style="font-size:30px;line-height:1.05;margin:10px 0 18px;color:#fff">${escapeHtml(title)}</h1><p style="font-size:14px;line-height:1.7;color:#b7b1bd">${safeBody}</p>${action}<p style="margin-top:36px;font-size:10px;letter-spacing:.12em;color:#625d69">THE MINIMICAL &amp; CO. · MINIMICAL DROP</p></div></div>`
  const response = await fetch(RESEND_API, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: fromAddress(), to: [to], subject, html }) })
  if (!response.ok) throw new Error(`Email provider ${response.status}: ${await response.text()}`)
  return { sent: true, skipped: false }
}

export function projectClientUrl(token: string) { return `${appUrl().replace(/\/$/, '')}/u/${token}` }

export function adminNotificationEmail() { return process.env.ADMIN_EMAIL || process.env.DROP_NOTIFICATION_EMAIL || null }
