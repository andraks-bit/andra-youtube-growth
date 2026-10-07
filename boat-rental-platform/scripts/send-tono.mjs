import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const KEY = env.RESEND_API_KEY
const FROM = env.RESEND_FROM_EMAIL || 'BoatHire24 <info@boathire24.com>'
const TO = ['info@deniasportfishing.com']
const SUBJECT = 'Syncing your calendar with BoatHire24 — one calendar across every agency'
const FEED = 'https://boathire24.com/api/ical/9a7a29a57dffe789c2ba0effd81fc995.ics'

const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;color:#1a2433;line-height:1.6;font-size:15px">
  <p>Hi Tono,</p>
  <p>Great question, and good news: we've added exactly this. You can now sync your calendar <strong>both ways</strong>, so you keep one master calendar (iCloud) and never update dates by hand across agencies.</p>

  <p style="margin:18px 0 6px;font-weight:800;color:#0e7a52">1) Auto-block your booked dates on BoatHire24 (import your iCloud)</p>
  <ol style="margin:4px 0 12px;padding-left:20px">
    <li><strong>iPhone/iPad:</strong> Calendar app → <em>Calendars</em> → tap the ⓘ next to the calendar you use for bookings → turn on <strong>Public Calendar</strong> → copy the <code>webcal://…</code> link. <strong>Mac:</strong> Calendar → right-click the calendar → <em>Share Calendar</em> → tick <strong>Public Calendar</strong> → copy the link.</li>
    <li>Log in to BoatHire24 → <strong>Host → Calendar</strong> → choose <em>Denia Sport Fishing Charter</em> → under <strong>"Calendar sync → 1. Import your calendar"</strong>, paste the link → <strong>Connect &amp; sync</strong>.</li>
  </ol>
  <p style="margin:0 0 14px;color:#55637a;font-size:13.5px">From then on, whenever you're booked in that calendar, those dates block automatically on BoatHire24. It re-checks daily and there's a <strong>Sync now</strong> button. <strong>If it's easier, just reply with your public iCloud link and I'll connect it for you.</strong></p>

  <p style="margin:18px 0 6px;font-weight:800;color:#0e7a52">2) See your BoatHire24 bookings inside iCloud (subscribe to your feed)</p>
  <p style="margin:0 0 6px">Your Denia calendar link:<br><a href="${FEED}">${FEED}</a></p>
  <ul style="margin:4px 0 12px;padding-left:20px">
    <li><strong>iPhone:</strong> Settings → Calendar → Accounts → Add Account → Other → <em>Add Subscribed Calendar</em> → paste.</li>
    <li><strong>Mac:</strong> Calendar → File → <em>New Calendar Subscription</em> → paste.</li>
  </ul>

  <p>It works with any calendar or agency that offers an <code>.ics</code> / webcal link — iCloud, Google, Booking.com and so on — so you can run one single calendar for everything.</p>
  <p>Anything you'd like me to set up for you, just reply.</p>
  <p>Best,<br>Andra<br>BoatHire24</p>
</div>`

const text = `Hi Tono,

Great question, and good news: we've added exactly this. You can now sync your calendar both ways, so you keep one master calendar (iCloud) and never update dates by hand across agencies.

1) Auto-block your booked dates on BoatHire24 (import your iCloud)
- iPhone/iPad: Calendar app > Calendars > tap the (i) next to your bookings calendar > turn on Public Calendar > copy the webcal:// link. Mac: Calendar > right-click the calendar > Share Calendar > tick Public Calendar > copy the link.
- Log in to BoatHire24 > Host > Calendar > choose Denia Sport Fishing Charter > under "Calendar sync > 1. Import your calendar", paste the link > Connect & sync.
From then on, whenever you're booked in that calendar, those dates block automatically on BoatHire24. It re-checks daily and there's a "Sync now" button. If it's easier, just reply with your public iCloud link and I'll connect it for you.

2) See your BoatHire24 bookings inside iCloud (subscribe to your feed)
Your Denia calendar link: ${FEED}
- iPhone: Settings > Calendar > Accounts > Add Account > Other > Add Subscribed Calendar > paste.
- Mac: Calendar > File > New Calendar Subscription > paste.

It works with any calendar or agency that offers an .ics / webcal link (iCloud, Google, Booking.com, etc.), so you can run one single calendar for everything.

Anything you'd like me to set up for you, just reply.

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
