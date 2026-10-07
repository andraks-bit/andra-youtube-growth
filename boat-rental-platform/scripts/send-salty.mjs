import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const KEY = env.RESEND_API_KEY
const FROM = env.RESEND_FROM_EMAIL || 'BoatHire24 <info@boathire24.com>'
const TO = ['miramarboattrips@gmail.com']
const CC = ['saltysuncharters@gmail.com']
const SUBJECT = 'Your Salty Sun Charters listing — photos fixed & live'
const LINK = 'https://boathire24.com/boats/willemstad-hatteras-salty-sun-charters'

const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:620px;color:#1a2433;line-height:1.6;font-size:15px">
  <p>Hi there,</p>
  <p>Thanks for letting us know about the trouble setting up your listing, and apologies for the slow reply on this.</p>
  <p><strong>Good news, it's all sorted:</strong></p>
  <ul>
    <li><strong>Photos:</strong> one of your images had uploaded in Apple's HEIC format, which Chrome and several browsers can't display, which is why the gallery looked like it was misbehaving. I've converted it, so <strong>all 6 of your photos now show correctly and in order</strong>.</li>
    <li><strong>Your listing is live:</strong> Salty Sun Charters, Willemstad, Curaçao — <a href="${LINK}">${LINK}</a></li>
  </ul>
  <p><strong>On payouts for Curaçao:</strong> our automatic payout provider (Stripe) doesn't currently cover bank accounts in Curaçao, so we'll set your payouts up a different way — we collect each guest's payment and send your share to you directly. If you already have a preferred way to receive international payments (local bank transfer / SWIFT, Wise, Payoneer, or PayPal), just let me know and we'll use that; otherwise I'll follow up with the simplest option for Curaçao.</p>
  <p>If you'd like any changes to the listing (cover photo, description, pricing, availability), just reply and I'll take care of it.</p>
  <p>Best,<br>Andra<br>BoatHire24</p>
</div>`

const text = `Hi there,

Thanks for letting us know about the trouble setting up your listing, and apologies for the slow reply.

Good news, it's all sorted:
- Photos: one of your images had uploaded in Apple's HEIC format, which Chrome and several browsers can't display, which is why the gallery looked like it was misbehaving. I've converted it, so all 6 of your photos now show correctly and in order.
- Your listing is live: Salty Sun Charters, Willemstad, Curaçao — ${LINK}

On payouts for Curaçao: our automatic payout provider (Stripe) doesn't currently cover bank accounts in Curaçao, so we'll set your payouts up a different way — we collect each guest's payment and send your share to you directly. If you already have a preferred way to receive international payments (local bank transfer / SWIFT, Wise, Payoneer, or PayPal), let me know and we'll use that; otherwise I'll follow up with the simplest option for Curaçao.

If you'd like any changes to the listing (cover photo, description, pricing, availability), just reply and I'll take care of it.

Best,
Andra
BoatHire24`

if (!process.argv.includes('--send')) { console.log('PREVIEW ONLY\nTo:', TO, 'Cc:', CC, '\n', text); process.exit(0) }
const r = await fetch('https://api.resend.com/emails', {
  method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: FROM, to: TO, cc: CC, subject: SUBJECT, html, text }),
})
const j = await r.json()
console.log(r.ok ? `✅ Sent — Resend id ${j.id}` : `❌ Failed: ${JSON.stringify(j)}`)
