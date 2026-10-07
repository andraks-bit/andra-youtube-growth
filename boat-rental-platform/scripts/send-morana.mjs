import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const KEY = env.RESEND_API_KEY
const FROM = env.RESEND_FROM_EMAIL || 'BoatHire24 <info@boathire24.com>'
const TO = ['nautilusadriaticus@gmail.com']
const SUBJECT = 'Your Sailing Korcula listing is live again'
const LINK = 'https://boathire24.com/boats/korcula-sailing'

const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:620px;color:#1a2433;line-height:1.6;font-size:15px">
  <p>Hi Morana,</p>
  <p>Thanks for flagging this. Your <strong>Sailing Korcula</strong> listing is <strong>active again and live</strong> on the site: <a href="${LINK}">${LINK}</a></p>
  <p>What happened: the activate/pause control is a single toggle, so it's easy to switch a listing to "paused" by accident, and once it's paused, editing the listing doesn't switch it back on. I've reactivated it for you, and it'll stay active now.</p>
  <p>One small thing that would help your listing: it currently shows <strong>"Price on request."</strong> If you'd like guests to see a rate up front (which usually gets more enquiries), just send me your pricing, e.g. per half-day or per hour, and I'll add it for you.</p>
  <p>Anything else you'd like adjusted, just reply.</p>
  <p>Best,<br>Andra<br>BoatHire24</p>
</div>`

const text = `Hi Morana,

Thanks for flagging this. Your Sailing Korcula listing is active again and live on the site: ${LINK}

What happened: the activate/pause control is a single toggle, so it's easy to switch a listing to "paused" by accident, and once it's paused, editing the listing doesn't switch it back on. I've reactivated it for you, and it'll stay active now.

One small thing that would help your listing: it currently shows "Price on request." If you'd like guests to see a rate up front (which usually gets more enquiries), just send me your pricing, e.g. per half-day or per hour, and I'll add it for you.

Anything else you'd like adjusted, just reply.

Best,
Andra
BoatHire24`

if (!process.argv.includes('--send')) { console.log('PREVIEW\nTo:', TO, '\n', text); process.exit(0) }
const r = await fetch('https://api.resend.com/emails', {
  method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: FROM, to: TO, subject: SUBJECT, html, text }),
})
const j = await r.json()
console.log(r.ok ? `✅ Sent — Resend id ${j.id}` : `❌ Failed: ${JSON.stringify(j)}`)
