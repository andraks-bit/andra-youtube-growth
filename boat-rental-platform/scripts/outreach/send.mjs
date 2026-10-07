#!/usr/bin/env node
/**
 * BoatHire24 — B2B supply outreach sender (Resend).
 *
 * Sends PERSONALIZED, THROTTLED emails to charter BUSINESSES at their OWN
 * publicly published contact addresses. Every email carries a working
 * unsubscribe link. Opt-outs are permanently honored via the suppression list.
 *
 * SAFE BY DEFAULT: dry-run unless you pass --send.
 *
 * Usage:
 *   node scripts/outreach/send.mjs                          # dry run over leads
 *   node scripts/outreach/send.mjs --send --limit 9 --delay 60
 *   node scripts/outreach/send.mjs --template followup --send
 *   node scripts/outreach/send.mjs --test --send            # one test email to OUTREACH_TEST_TO
 *   node scripts/outreach/send.mjs --test --to you@x.com --send
 *
 * Flags:
 *   --send            actually send (otherwise dry run)
 *   --test            send a single sample email to --to / OUTREACH_TEST_TO (does not touch leads/DB)
 *   --to <addr>       test recipient override
 *   --template <t>    'first' (default) | 'followup'
 *   --limit <n>       max emails this run (default 15)
 *   --delay <sec>     seconds between sends (default 45)
 *   --from <addr>     override sender (default OUTREACH_FROM or RESEND_FROM_EMAIL)
 *
 * Env: RESEND_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      NEXT_PUBLIC_APP_URL, OUTREACH_SECRET, OUTREACH_FROM (or RESEND_FROM_EMAIL),
 *      OUTREACH_SENDER_NAME, OUTREACH_SENDER_TITLE, OUTREACH_SENDER_PHONE,
 *      OUTREACH_SENDER_PHOTO_URL, OUTREACH_TEST_TO
 */
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'
import { templates } from './templates.mjs'

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d }

const SEND      = has('--send')
const TEST      = has('--test')
const TEST_TO   = val('--to', process.env.OUTREACH_TEST_TO || process.env.OUTREACH_FROM)
const TEMPLATE  = val('--template', 'first')
const LIMIT     = parseInt(val('--limit', '15'), 10)
const DELAY_MS  = parseInt(val('--delay', '45'), 10) * 1000
const FROM_ADDR = val('--from', process.env.OUTREACH_FROM || process.env.RESEND_FROM_EMAIL)
const FROM      = `BoatHire24 <${FROM_ADDR}>`
const APP_URL   = (process.env.NEXT_PUBLIC_APP_URL || 'https://boathire24.com').replace(/\/$/, '')
const SENDER    = process.env.OUTREACH_SENDER_NAME  || 'The BoatHire24 team'
const TITLE     = process.env.OUTREACH_SENDER_TITLE || ''
const PHONE     = process.env.OUTREACH_SENDER_PHONE || ''
const PHOTO     = process.env.OUTREACH_SENDER_PHOTO_URL || ''

if (!templates[TEMPLATE]) { console.error(`Unknown template "${TEMPLATE}"`); process.exit(1) }
if (SEND && (!process.env.RESEND_API_KEY || !FROM_ADDR)) {
  console.error('Missing RESEND_API_KEY or sender address. Set env before --send.'); process.exit(1)
}

const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) : null
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const isRealEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !/\(confirm|via site|via form/i.test(e)
const token = (email) =>
  crypto.createHmac('sha256', process.env.OUTREACH_SECRET || 'change-me')
        .update(email.trim().toLowerCase()).digest('hex').slice(0, 32)
const unsubUrl = (email) =>
  `${APP_URL}/api/outreach/unsubscribe?e=${encodeURIComponent(email)}&t=${token(email)}`
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function render(str, lead) {
  const firstName = lead.first_name || `${lead.company} team`
  const boat = lead.boat_type ? lead.boat_type.split('/')[0].trim().toLowerCase() : 'boats'
  let out = str
    .replaceAll('{{company}}', lead.company)
    .replaceAll('{{firstName}}', firstName)
    .replaceAll('{{location}}', lead.location || 'the Costa del Sol')
    .replaceAll('{{boat}}', boat)
    .replaceAll('{{senderName}}', SENDER)
    .replaceAll('{{senderTitle}}', TITLE)
    .replaceAll('{{senderPhone}}', PHONE)
    .replaceAll('{{unsubscribeUrl}}', unsubUrl(lead.email))
  // tidy artifacts when title/phone are empty
  out = out.replace(/,\s*\n/g, '\n').replace(/·\s*·/g, '·').replace(/·\s*\n/g, '\n')
  return out
}

// Build a simple, deliverability-friendly HTML version with a photo signature.
function toHtml(text, lead) {
  const unsub = unsubUrl(lead.email)
  // strip the trailing plain-text unsub footer; we re-add an HTML one
  const body = text.split('\n—\n')[0]
  const paras = esc(body).split(/\n\s*\n/).map(p => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`).join('')
  const photo = PHOTO
    ? `<td style="padding-right:12px;vertical-align:middle">
         <img src="${PHOTO}" width="56" height="56" alt="${esc(SENDER)}"
              style="border-radius:50%;display:block;width:56px;height:56px;object-fit:cover"></td>`
    : ''
  const sig = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid #e5e5e5;padding-top:14px">
      <tr>${photo}
        <td style="vertical-align:middle;font-family:Arial,sans-serif;color:#0b3d5c">
          <div style="font-weight:bold">${esc(SENDER)}${TITLE ? `, ${esc(TITLE)}` : ''}</div>
          <div style="color:#555;font-size:13px">BoatHire24${PHONE ? ` · ${esc(PHONE)}` : ''} ·
            <a href="${APP_URL}" style="color:#126ea8">boathire24.com</a></div>
        </td></tr></table>`
  const footer = `<p style="margin-top:18px;color:#999;font-size:12px;font-family:Arial,sans-serif">
      You received this because ${esc(lead.company)} publicly lists this address for business enquiries.
      <a href="${unsub}" style="color:#999">Unsubscribe</a>.</p>`
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:560px">${paras}${sig}${footer}</div>`
}

async function sendOne(lead, lang) {
  const tpl = templates[TEMPLATE][lang]
  const subject = render(tpl.subject, lead)
  const text = render(tpl.text, lead)
  const html = toHtml(text, lead)
  const res = await resend.emails.send({
    from: FROM, to: lead.email, subject, text, html,
    headers: { 'List-Unsubscribe': `<${unsubUrl(lead.email)}>`,
               'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  })
  if (res?.error) throw new Error(res.error.message || JSON.stringify(res.error))
  return res?.data?.id || '?'
}

async function runTest() {
  const lead = { company: 'Marbella Boat Charter', location: 'Puerto Banús',
                 boat_type: 'yachts', email: TEST_TO, lang: 'en' }
  console.log(`\nTEST email — to=${TEST_TO} from=${FROM} mode=${SEND ? 'SEND' : 'DRY-RUN'}\n`)
  const subject = render(templates[TEMPLATE].en.subject, lead)
  if (!SEND) {
    console.log(`DRY  would send "${subject}" to ${TEST_TO}`)
    console.log('\n--- text preview ---\n' + render(templates[TEMPLATE].en.text, lead)); return
  }
  try {
    const id = await sendOne(lead, 'en')
    console.log(`SENT test email to ${TEST_TO}  id=${id}`)
  } catch (e) { console.error(`FAIL test send — ${e.message}`) }
}

async function runCampaign() {
  console.log(`\nOutreach — template="${TEMPLATE}" mode=${SEND ? 'SEND' : 'DRY-RUN'} limit=${LIMIT} delay=${DELAY_MS/1000}s\n`)
  if (!supabase) { console.error('Supabase env missing — needed for the leads campaign.'); process.exit(1) }
  const { data: leads, error } = await supabase
    .from('outreach_leads').select('*')
    .in('status', TEMPLATE === 'first' ? ['not_started', 'researching'] : ['emailed'])
    .order('priority', { ascending: true })
  if (error) { console.error('Lead query failed:', error.message); process.exit(1) }
  const { data: suppressed } = await supabase.from('outreach_suppression').select('email')
  const blocked = new Set((suppressed || []).map((r) => r.email.toLowerCase()))

  let sent = 0
  for (const lead of leads || []) {
    if (sent >= LIMIT) { console.log(`Reached limit (${LIMIT}).`); break }
    const email = (lead.email || '').trim().toLowerCase()
    if (!isRealEmail(email)) { console.log(`skip  ${lead.company} — no verified email`); continue }
    if (blocked.has(email))  { console.log(`skip  ${lead.company} — opted out`); continue }
    const lang = templates[TEMPLATE][lead.lang] ? lead.lang : 'en'
    if (!SEND) { console.log(`DRY   ${lead.company} <${email}> [${lang}]`); sent++; continue }
    try {
      const id = await sendOne({ ...lead, email }, lang)
      await supabase.from('outreach_sends').insert({ lead_id: lead.id, email, template: TEMPLATE,
        subject: render(templates[TEMPLATE][lang].subject, lead), provider_id: id, status: 'sent' })
      await supabase.from('outreach_leads').update({ status: 'emailed', updated_at: new Date().toISOString() }).eq('id', lead.id)
      console.log(`SENT  ${lead.company} <${email}>  id=${id}`)
      sent++
      if (sent < LIMIT) await sleep(DELAY_MS)
    } catch (e) { console.error(`FAIL  ${lead.company} <${email}> — ${e.message}`) }
  }
  console.log(`\nDone. ${SEND ? 'Sent' : 'Would send'} ${sent} email(s).\n`)
}

await (TEST ? runTest() : runCampaign())
