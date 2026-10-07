#!/usr/bin/env node
// Sends the calendar-sync completion note + forwardable host guidelines to Andra.
// Run with --send to actually send (otherwise prints a preview).
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const KEY = env.RESEND_API_KEY
const FROM = env.RESEND_FROM_EMAIL || 'BoatHire24 <info@boathire24.com>'
const TO = 'andra.kiirkivi@gmail.com'
const SUBJECT = 'Calendar sync is live — guidelines to send Tono (and any host)'

const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a2433;line-height:1.55;font-size:15px">
  <p>Hi Andra,</p>
  <p><strong>Calendar sync is built, tested end-to-end, and live on boathire24.com.</strong> It answers Tono Balaguer's question (and it's a feature every host will want): hosts can now sync their availability with iCloud, Google, Airbnb or any calendar — no more manual date updates.</p>
  <p>It works <strong>both ways</strong>, exactly like Airbnb/Booking.com:</p>
  <ul>
    <li><strong>Import</strong> — the host pastes their calendar's public link and BoatHire24 auto-blocks the busy dates (re-checked daily + on demand).</li>
    <li><strong>Export</strong> — each boat gets a BoatHire24 calendar link the host subscribes to, so our bookings appear in their own calendar.</li>
  </ul>
  <p>I tested the full flow on production (connect, import, re-sync, disconnect, and the export feed) — all working. You can point Tono to the guidelines below, or set it up for him from his boat's <em>Host → Calendar</em> page.</p>

  <div style="margin:22px 0;padding:18px 20px;background:#f5f8fb;border:1px solid #e2e9f0;border-radius:12px">
    <p style="margin:0 0 12px;font-weight:700;font-size:16px">📅 How to sync your calendar with BoatHire24</p>
    <p style="margin:0 0 4px;font-weight:700;color:#0e7a52">A) Auto-block your booked dates (import your calendar)</p>
    <ol style="margin:4px 0 14px;padding-left:20px">
      <li><strong>iPhone/iPad:</strong> Calendar app → <em>Calendars</em> → tap the ⓘ next to the calendar you use for bookings → turn on <strong>Public Calendar</strong> → copy the <code>webcal://…</code> link.<br><strong>Mac:</strong> Calendar → right-click the calendar → <em>Share Calendar</em> → tick <strong>Public Calendar</strong> → copy the link.</li>
      <li>Log in to BoatHire24 → <strong>Host → Calendar</strong> → choose your boat.</li>
      <li>Under <strong>“Calendar sync → 1. Import your calendar”</strong>, paste the link and click <strong>Connect &amp; sync</strong>.</li>
    </ol>
    <p style="margin:0 0 14px;color:#55637a;font-size:13.5px">That's it — your busy dates block automatically. BoatHire24 re-checks daily and you can press <strong>Sync now</strong> anytime. (Apple caches public calendars, so a change you just made in iCloud can take a little while to appear.)</p>
    <p style="margin:0 0 4px;font-weight:700;color:#0e7a52">B) See BoatHire24 bookings in your own calendar (subscribe)</p>
    <ol style="margin:4px 0 6px;padding-left:20px">
      <li>In the same panel, <strong>“2. Subscribe to your BoatHire24 calendar”</strong>, copy the link.</li>
      <li><strong>iPhone:</strong> Settings → Calendar → Accounts → Add Account → Other → <em>Add Subscribed Calendar</em> → paste.<br><strong>Mac:</strong> Calendar → File → <em>New Calendar Subscription</em> → paste.</li>
    </ol>
    <p style="margin:6px 0 0;color:#55637a;font-size:13.5px">Works with any calendar that offers a public .ics / webcal link — iCloud, Google, Airbnb, Booking.com — so you can keep one master calendar across every agency you work with.</p>
  </div>

  <p style="color:#55637a;font-size:13.5px">One small ops note for you (not for the host): the sync depends on the calendar's public link — if a host regenerates or turns off their public calendar, the link stops working and they'll just re-paste a new one.</p>
  <p>Best,<br>Mardo</p>
</div>`

const text = `Hi Andra,

Calendar sync is built, tested end-to-end, and live on boathire24.com. It answers Tono Balaguer's question and every host will want it: hosts can sync availability with iCloud/Google/Airbnb/any calendar — no manual date updates. It works both ways (import busy dates to auto-block, and export a BoatHire24 feed to subscribe to). I tested connect/import/re-sync/disconnect and the export feed on production — all working.

Guidelines to send Tono (or set it up from his Host > Calendar page):

A) Auto-block your booked dates (import your calendar)
1. iPhone/iPad: Calendar app > Calendars > tap the (i) next to your bookings calendar > turn on Public Calendar > copy the webcal:// link. (Mac: Calendar > right-click the calendar > Share Calendar > tick Public Calendar > copy the link.)
2. Log in to BoatHire24 > Host > Calendar > choose your boat.
3. Under "Calendar sync > 1. Import your calendar", paste the link and click Connect & sync.
Your busy dates block automatically. It re-checks daily and you can press "Sync now" anytime. (Apple caches public calendars, so a just-made change can take a little while to appear.)

B) See BoatHire24 bookings in your own calendar (subscribe)
1. In the same panel, "2. Subscribe to your BoatHire24 calendar", copy the link.
2. iPhone: Settings > Calendar > Accounts > Add Account > Other > Add Subscribed Calendar > paste. (Mac: Calendar > File > New Calendar Subscription > paste.)
Works with any public .ics/webcal link — iCloud, Google, Airbnb, Booking.com — one master calendar across every agency.

Ops note (not for the host): if a host turns off/regenerates their public calendar, the link stops working and they just re-paste a new one.

Best,
Mardo`

if (!process.argv.includes('--send')) {
  console.log(`PREVIEW ONLY (add --send to send)\nFrom: ${FROM}\nTo:   ${TO}\nSubj: ${SUBJECT}\n\n--- text ---\n${text}`)
  process.exit(0)
}
const r = await fetch('https://api.resend.com/emails', {
  method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: FROM, to: [TO], subject: SUBJECT, html, text }),
})
const j = await r.json()
console.log(r.ok ? `✅ Sent to ${TO} — Resend id ${j.id}` : `❌ Failed: ${JSON.stringify(j)}`)
