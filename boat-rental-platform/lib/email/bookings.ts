import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from '@/lib/whatsapp'
import { stripe } from '@/lib/stripe'

const resend = new Resend(process.env.RESEND_API_KEY)
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const FROM = process.env.RESEND_FROM_EMAIL || 'BoatHire24 <info@boathire24.com>'
const SITE = 'https://boathire24.com'
const OPS_INBOX = 'info@boathire24.com' // central boathire24 inbox — copied on every request

async function emailOf(userId: string): Promise<string | null> {
  try { const { data } = await admin.auth.admin.getUserById(userId); return data.user?.email ?? null } catch { return null }
}

// Reads phone from auth user_metadata (set on the Settings page — no schema
// change needed). Returns null if absent, so WhatsApp simply no-ops until a
// number (and Twilio creds) are in place.
async function phoneOf(userId: string): Promise<string | null> {
  try { const { data } = await admin.auth.admin.getUserById(userId); return ((data.user?.user_metadata as any)?.phone as string | undefined)?.trim() || null } catch { return null }
}

// For BoatHire24-managed boats: render the private owner-contact block so the
// ops team can chase availability with the real owner. Returns '' for normal
// (host-owned) boats, which have no managed_owner_contacts row.
async function managedOwnerHtml(boatId: string): Promise<string> {
  try {
    const { data } = await admin.from('managed_owner_contacts')
      .select('owner_name, owner_email, owner_phone, owner_website, notes')
      .eq('boat_id', boatId).maybeSingle()
    const o = data as { owner_name?: string; owner_email?: string; owner_phone?: string; owner_website?: string; notes?: string } | null
    if (!o) return ''
    const row = (label: string, val?: string) => val
      ? `<tr><td style="padding:5px 0;color:#8b94a3">${label}</td><td style="padding:5px 0;color:#f4f4f2;text-align:right;font-weight:600">${val}</td></tr>` : ''
    return `
      <div style="margin-top:16px;padding:14px 16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.30);border-radius:12px">
        <p style="margin:0 0 6px;color:#f59e0b;font-weight:800;font-size:13px">🛥 Managed listing — contact the owner to confirm availability</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          ${row('Owner', o.owner_name)}
          ${row('Phone', o.owner_phone)}
          ${row('Email', o.owner_email)}
          ${row('Website', o.owner_website)}
          ${row('Notes', o.notes)}
        </table>
      </div>`
  } catch { return '' }
}

type B = {
  id: string; renter_id: string; boat_id: string; start_datetime: string; end_datetime: string
  guests_count: number; total: number; currency: string; duration_hours: number | null
  stripe_payment_intent_id: string | null
}

async function loadBooking(bookingId: string) {
  const { data: b } = await admin.from('bookings')
    .select('id, renter_id, boat_id, start_datetime, end_datetime, guests_count, total, currency, duration_hours, stripe_payment_intent_id')
    .eq('id', bookingId).single()
  if (!b) return null
  const { data: boat } = await admin.from('boats').select('name, host_id').eq('id', (b as B).boat_id).single()
  return { b: b as B, boat: boat as { name: string; host_id: string } | null }
}

function fmt(b: B, boatName: string) {
  const d = new Date(b.start_datetime)
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const dur = b.duration_hours ? `${b.duration_hours}h` : ''
  const money = `${b.currency === 'EUR' ? '€' : b.currency + ' '}${b.total.toLocaleString()}`
  return { boatName, date, time, dur, money }
}

const shell = (heading: string, accent: string, inner: string) => `
  <div style="background:#07101e;padding:32px 16px;font-family:-apple-system,Segoe UI,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#0c1828;border:1px solid rgba(116,207,232,0.25);border-radius:16px;overflow:hidden">
      <div style="padding:22px 26px;border-bottom:1px solid rgba(116,207,232,0.15)"><span style="color:${accent};font-weight:800;font-size:18px">${heading}</span></div>
      <div style="padding:24px 26px;color:#cfd6df;font-size:14px;line-height:1.65">${inner}</div>
    </div>
  </div>`

const detailRows = (f: ReturnType<typeof fmt>) => `
  <table style="width:100%;border-collapse:collapse;margin:14px 0">
    <tr><td style="padding:6px 0;color:#8b94a3">Boat</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${f.boatName}</td></tr>
    <tr><td style="padding:6px 0;color:#8b94a3">Date</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${f.date}</td></tr>
    <tr><td style="padding:6px 0;color:#8b94a3">Time</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${f.time}${f.dur ? ` · ${f.dur}` : ''}</td></tr>
    <tr><td style="padding:6px 0;color:#8b94a3">Total</td><td style="padding:6px 0;color:#74cfe8;text-align:right;font-weight:800">${f.money}</td></tr>
  </table>`

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6);color:#07101e;font-weight:800;text-decoration:none;padding:12px 26px;border-radius:99px;font-size:14px">${label}</a>`

/** Booker authorized a hold → ask the host to approve. */
export async function sendHostNewRequest(bookingId: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  // Fire once, only for a genuinely authorized hold. Idempotent across both the
  // client trigger and the Stripe webhook, via a flag on the PaymentIntent.
  const piId = ctx.b.stripe_payment_intent_id
  if (piId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId)
      if (pi.status !== 'requires_capture') return            // not an authorized request (yet)
      if ((pi.metadata as Record<string, string>)?.host_notified === '1') return // already notified
      await stripe.paymentIntents.update(piId, { metadata: { host_notified: '1' } })
    } catch { /* if Stripe is unreachable, still notify rather than drop it */ }
  }
  const f = fmt(ctx.b, ctx.boat.name)
  const to = await emailOf(ctx.boat.host_id)
  const ownerBlock = await managedOwnerHtml(ctx.b.boat_id)
  await resend.emails.send({
    from: FROM, to: [to, OPS_INBOX].filter(Boolean) as string[], subject: `New booking request — ${f.boatName} · ${f.date}`,
    html: shell('📅 New booking request', '#74cfe8', `
      <p>You have a new booking request. The guest's card is <strong style="color:#f4f4f2">held (not charged)</strong> — approve within <strong>24h</strong> and they're charged; decline and the hold is released automatically.</p>
      ${detailRows(f)}
      ${ownerBlock}
      <p style="margin:18px 0 6px">${btn(`${SITE}/host/bookings`, 'Review & approve →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">Open your host dashboard to approve or decline.</p>`),
  }).catch(() => {})
  await sendWhatsApp(await phoneOf(ctx.boat.host_id),
    `🚤 *New booking request* on BoatHire24\n${f.boatName} · ${f.date} ${f.time}${f.dur ? ` (${f.dur})` : ''} · ${ctx.b.guests_count} guests · ${f.money}\nCard is *held, not charged* — approve within 24h:\n${SITE}/host/bookings`)
}

/** Host approved & payment captured (or instant book) → tell the guest. */
export async function sendBookerConfirmed(bookingId: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const to = await emailOf(ctx.b.renter_id)
  if (to) await resend.emails.send({
    from: FROM, to, subject: `Confirmed! Your ${f.boatName} on ${f.date} 🎉`,
    html: shell('🎉 Booking confirmed', '#22c55e', `
      <p>Great news — your booking is <strong style="color:#22c55e">confirmed</strong> and your payment has been processed.</p>
      ${detailRows(f)}
      <p style="margin:18px 0 6px">${btn(`${SITE}/dashboard`, 'View my trip →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">See you on the water!</p>`),
  }).catch(() => {})
  await sendWhatsApp(await phoneOf(ctx.b.renter_id),
    `🎉 *Booking confirmed!* Your ${f.boatName} on ${f.date} ${f.time} is locked in — ${f.money} charged.\nView your trip: ${SITE}/dashboard\nSee you on the water!`)
}

/** Host declined / request expired → tell the guest (no charge). */
export async function sendBookerDeclined(bookingId: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const to = await emailOf(ctx.b.renter_id)
  if (to) await resend.emails.send({
    from: FROM, to, subject: `Update on your ${f.boatName} request`,
    html: shell('Request not available', '#f59e0b', `
      <p>Unfortunately the <strong style="color:#f4f4f2">${f.boatName}</strong> isn't available for ${f.date}, so this request couldn't be confirmed. <strong style="color:#22c55e">You have not been charged</strong> — the card hold has been released.</p>
      <p style="margin:18px 0 6px">${btn(`${SITE}/search`, 'Find another boat →')}</p>`),
  }).catch(() => {})
  await sendWhatsApp(await phoneOf(ctx.b.renter_id),
    `Update: your ${f.boatName} request for ${f.date} couldn't be confirmed. *You have not been charged* — the hold was released.\nFind another boat: ${SITE}/search`)
}

/** Either party cancelled → notify guest, host, and ops. `refundOwed` = the trip was already paid. */
export async function sendBookingCancelled(bookingId: string, by: 'host' | 'renter', refundOwed: boolean) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const renterEmail = await emailOf(ctx.b.renter_id)
  const hostEmail = await emailOf(ctx.boat.host_id)
  const who = by === 'host' ? 'the host' : 'the guest'

  // Guest-facing
  if (renterEmail) await resend.emails.send({
    from: FROM, to: renterEmail, subject: `Cancelled — your ${f.boatName} on ${f.date}`,
    html: shell('Booking cancelled', '#f87171', `
      <p>This booking has been cancelled by ${who}.</p>
      ${detailRows(f)}
      ${refundOwed
        ? `<p style="color:#f59e0b">If your card was charged, your refund will be returned to your original payment method.</p>`
        : `<p style="color:#22c55e">No charge was taken.</p>`}
      <p style="margin:18px 0 6px">${btn(`${SITE}/search`, 'Browse other boats →')}</p>`),
  }).catch(() => {})

  // Host + ops
  await resend.emails.send({
    from: FROM, to: [hostEmail, OPS_INBOX].filter(Boolean) as string[], subject: `Booking cancelled — ${f.boatName} · ${f.date}`,
    html: shell('Booking cancelled', '#f87171', `
      <p>The booking below was cancelled by ${who}. The date has been released for new bookings.</p>
      ${detailRows(f)}
      ${refundOwed ? `<p style="color:#f59e0b"><strong>Action needed:</strong> this trip was paid — issue any refund from the Stripe dashboard.</p>` : ''}
      <p style="margin:18px 0 6px">${btn(`${SITE}/host/bookings`, 'Open host dashboard →')}</p>`),
  }).catch(() => {})

  // WhatsApp the party that did NOT cancel.
  if (by === 'host') {
    await sendWhatsApp(await phoneOf(ctx.b.renter_id),
      `Your ${f.boatName} booking on ${f.date} ${f.time} was cancelled by the host.${refundOwed ? ' Any charge will be refunded.' : ' No charge was taken.'}\n${SITE}/search`)
  } else {
    await sendWhatsApp(await phoneOf(ctx.boat.host_id),
      `A booking was cancelled by the guest: ${f.boatName} · ${f.date} ${f.time}. The date is free again.\n${SITE}/host/bookings`)
  }
}

/** Guest changed their booking's date/time/duration → re-notify host (+ confirm to guest). */
export async function sendBookingModified(bookingId: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const hostEmail = await emailOf(ctx.boat.host_id)
  const renterEmail = await emailOf(ctx.b.renter_id)

  await resend.emails.send({
    from: FROM, to: [hostEmail, OPS_INBOX].filter(Boolean) as string[], subject: `Updated request — ${f.boatName} · ${f.date}`,
    html: shell('📅 Booking updated by guest', '#74cfe8', `
      <p>The guest changed their requested date, time, or duration. Please review the new details and approve if the slot works.</p>
      ${detailRows(f)}
      <p style="margin:18px 0 6px">${btn(`${SITE}/host/bookings`, 'Review →')}</p>`),
  }).catch(() => {})

  if (renterEmail) await resend.emails.send({
    from: FROM, to: renterEmail, subject: `Your ${f.boatName} booking was updated`,
    html: shell('Booking updated', '#22c55e', `
      <p>Your booking has been updated to the new date and time below. The host has been notified.</p>
      ${detailRows(f)}
      <p style="margin:18px 0 6px">${btn(`${SITE}/dashboard`, 'View my trip →')}</p>`),
  }).catch(() => {})

  await sendWhatsApp(await phoneOf(ctx.boat.host_id),
    `📅 A guest updated their booking: ${f.boatName} · ${f.date} ${f.time}${f.dur ? ` (${f.dur})` : ''}. Review: ${SITE}/host/bookings`)
}

/** Visitor asked for a price on an unpriced boat → notify the owner (email + WhatsApp). */
export async function sendHostQuoteRequest(opts: {
  boatId: string; name: string; email?: string; phone?: string; date?: string; guests?: number; message?: string
}) {
  const { data: boatRow } = await admin.from('boats').select('name, host_id').eq('id', opts.boatId).single()
  if (!boatRow) return
  const boat = boatRow as { name: string; host_id: string }
  const contact = [opts.email, opts.phone].filter(Boolean).join(' · ') || '—'
  const when = [opts.date, opts.guests ? `${opts.guests} guests` : ''].filter(Boolean).join(' · ') || '—'

  const hostEmail = await emailOf(boat.host_id)
  await resend.emails.send({
    from: FROM, to: [hostEmail, OPS_INBOX].filter(Boolean) as string[], subject: `💬 New booking request — ${boat.name}`,
    html: shell('💬 New booking request', '#74cfe8', `
      <p>Someone wants a price for your <strong style="color:#f4f4f2">${boat.name}</strong>:</p>
      <table style="width:100%;border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:6px 0;color:#8b94a3">From</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${opts.name || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Contact</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${contact}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">When</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${when}</td></tr>
      </table>
      ${opts.message ? `<p style="color:#cfd6df;font-style:italic">&ldquo;${opts.message}&rdquo;</p>` : ''}
      <p style="margin:18px 0 6px">${btn(`${SITE}/host/bookings`, 'Manage in your dashboard →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">Reply to them directly at ${contact}, or open your dashboard to manage all your requests.</p>`),
  }).catch(() => {})

  await sendWhatsApp(await phoneOf(boat.host_id),
    `💬 *Quote request* — ${boat.name}\nFrom: ${opts.name || '—'} (${contact})\nWhen: ${when}${opts.message ? `\n"${opts.message}"` : ''}\nReply to them directly, or manage it: ${SITE}/host/bookings`)
}

/** Guest submitted a price-on-request quote → confirm to the guest (email + WhatsApp). */
export async function sendBookerQuoteReceived(bookingId: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const to = await emailOf(ctx.b.renter_id)
  const rows = `
    <table style="width:100%;border-collapse:collapse;margin:14px 0">
      <tr><td style="padding:6px 0;color:#8b94a3">Boat</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${f.boatName}</td></tr>
      <tr><td style="padding:6px 0;color:#8b94a3">Date</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${f.date}</td></tr>
      <tr><td style="padding:6px 0;color:#8b94a3">Guests</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${ctx.b.guests_count}</td></tr>
      <tr><td style="padding:6px 0;color:#8b94a3">Price</td><td style="padding:6px 0;color:#74cfe8;text-align:right;font-weight:800">On request</td></tr>
    </table>`
  if (to) await resend.emails.send({
    from: FROM, to, subject: `✅ Request received — ${f.boatName}`,
    html: shell('✅ Your request is in!', '#22c55e', `
      <p>Thanks! We&rsquo;ve sent your request for <strong style="color:#f4f4f2">${f.boatName}</strong> to the owner — they&rsquo;ll get back to you shortly with a price and availability.</p>
      ${rows}
      <p style="margin:18px 0 6px">${btn(`${SITE}/dashboard`, 'View my request →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">Track it anytime under My Trips.</p>`),
  }).catch(() => {})
  await sendWhatsApp(await phoneOf(ctx.b.renter_id),
    `✅ *Request received* — ${f.boatName} · ${f.date} · ${ctx.b.guests_count} guests.\nThe owner will reply with a price + availability. Track it: ${SITE}/dashboard`)
}

/** Request-first booking (priced boat): notify the owner of a date+hours request — no card yet. */
export async function sendHostBookingRequest(opts: {
  boatId: string; guestEmail?: string; guestName?: string; guestPhone?: string
  date: string; time?: string; durationHours?: number | null; guests?: number; total?: number; currency?: string
}) {
  const { data: boatRow } = await admin.from('boats').select('name, host_id').eq('id', opts.boatId).single()
  if (!boatRow) return
  const boat = boatRow as { name: string; host_id: string }
  const money = opts.total != null ? `${opts.currency === 'EUR' ? '€' : (opts.currency || '') + ' '}${opts.total.toLocaleString()}` : '—'
  const dur = opts.durationHours ? `${opts.durationHours}h` : ''
  const dt = new Date(`${opts.date}T${opts.time || '09:00'}:00`)
  const dateStr = isNaN(dt.getTime()) ? opts.date : dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const contact = [opts.guestEmail, opts.guestPhone].filter(Boolean).join(' · ') || '—'

  const hostEmail = await emailOf(boat.host_id)
  const ownerBlock = await managedOwnerHtml(opts.boatId)
  await resend.emails.send({
    from: FROM, to: [hostEmail, OPS_INBOX].filter(Boolean) as string[], subject: `📅 Booking request — ${boat.name} · ${dateStr}`,
    html: shell('📅 New booking request', '#74cfe8', `
      <p>New booking request for <strong style="color:#f4f4f2">${boat.name}</strong> — confirm availability with the guest and send a payment link.</p>
      <table style="width:100%;border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:6px 0;color:#8b94a3">Date</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${dateStr}${opts.time ? ` · ${opts.time}` : ''}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Duration</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${dur || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Guests</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${opts.guests ?? '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Price</td><td style="padding:6px 0;color:#74cfe8;text-align:right;font-weight:800">${money}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Guest</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${opts.guestName || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Contact</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${contact}</td></tr>
      </table>
      ${ownerBlock}
      <p style="margin:18px 0 6px">${btn(`${SITE}/host/bookings`, 'Manage in your dashboard →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">Confirm availability and send the guest a payment link from your dashboard.</p>`),
  }).catch(() => {})

  await sendWhatsApp(await phoneOf(boat.host_id),
    `📅 *Booking request* — ${boat.name}\n${dateStr}${opts.time ? ` ${opts.time}` : ''}${dur ? ` · ${dur}` : ''} · ${opts.guests ?? '?'} guests · ${money}\nGuest: ${opts.guestName || '—'} (${contact})\nConfirm + send a payment link: ${SITE}/host/bookings`)
}

/** Host accepted a request-first booking → send the guest a Stripe payment link to pay. */
export async function sendBookerPaymentLink(bookingId: string, url: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const to = await emailOf(ctx.b.renter_id)
  if (to) await resend.emails.send({
    from: FROM, to, subject: `✅ ${f.boatName} accepted — complete your payment`,
    html: shell('✅ Your request was accepted!', '#22c55e', `
      <p>Great news — the owner accepted your request for <strong style="color:#f4f4f2">${f.boatName}</strong>. Complete your payment to lock it in:</p>
      ${detailRows(f)}
      <p style="margin:18px 0 6px">${btn(url, 'Pay & confirm →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">Secure Stripe checkout · this finalises your booking.</p>`),
  }).catch(() => {})
  const hostEmail = await emailOf(ctx.boat.host_id)
  await resend.emails.send({
    from: FROM, to: [hostEmail, OPS_INBOX].filter(Boolean) as string[],
    subject: `✅ You accepted ${f.boatName} — payment link sent`,
    html: shell('✅ Request accepted', '#22c55e', `
      <p>You accepted the request for <strong style="color:#f4f4f2">${f.boatName}</strong>. The guest now has a secure payment link — you&rsquo;ll get a confirmation the moment they pay.</p>
      ${detailRows(f)}
      <p style="margin:18px 0 6px">${btn(`${SITE}/host/bookings`, 'View in dashboard →')}</p>`),
  }).catch(() => {})
  await sendWhatsApp(await phoneOf(ctx.b.renter_id),
    `✅ *${f.boatName}* — the owner accepted your request for ${f.date}! Pay ${f.money} to confirm:\n${url}`)
}

/** Host priced a quote request → tell the guest to review the offer and pay. */
export async function sendBookerOffer(bookingId: string, url: string, message?: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const to = await emailOf(ctx.b.renter_id)
  if (to) await resend.emails.send({
    from: FROM, to, subject: `💬 You have an offer for ${f.boatName} — ${f.money}`,
    html: shell('💬 You have an offer', '#74cfe8', `
      <p>Good news — the owner priced your request for <strong style="color:#f4f4f2">${f.boatName}</strong>. Review it and pay to lock in the date:</p>
      ${detailRows(f)}
      ${message ? `<p style="color:#cfd6df;font-style:italic">&ldquo;${message}&rdquo;</p>` : ''}
      <p style="margin:18px 0 6px">${btn(url, 'Accept & pay →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">Secure Stripe checkout · your date is held the moment you pay.</p>`),
  }).catch(() => {})
  const hostEmail = await emailOf(ctx.boat.host_id)
  await resend.emails.send({
    from: FROM, to: [hostEmail, OPS_INBOX].filter(Boolean) as string[],
    subject: `💬 You sent an offer for ${f.boatName} — ${f.money}`,
    html: shell('💬 Offer sent', '#74cfe8', `
      <p>You priced the request for <strong style="color:#f4f4f2">${f.boatName}</strong> at <strong style="color:#74cfe8">${f.money}</strong> and sent it to the guest. You&rsquo;ll get a confirmation when they pay.</p>
      ${detailRows(f)}
      <p style="margin:18px 0 6px">${btn(`${SITE}/host/bookings`, 'View in dashboard →')}</p>`),
  }).catch(() => {})
  await sendWhatsApp(await phoneOf(ctx.b.renter_id),
    `💬 *Offer received!* The owner priced your ${f.boatName} on ${f.date} at ${f.money}.${message ? `\n"${message}"` : ''}\nAccept & pay:\n${url}`)
}

/** Booking paid & confirmed → notify the boat owner + the boathire24 ops inbox (both parties). */
export async function sendHostBookingConfirmed(bookingId: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const { data: boatLoc } = await admin.from('boats').select('departure_port, locations(city, country)').eq('id', ctx.b.boat_id).single()
  const loc = boatLoc as { departure_port?: string | null; locations?: { city?: string; country?: string } | null } | null
  const location = [loc?.departure_port, loc?.locations?.city, loc?.locations?.country].filter(Boolean).join(', ') || '—'
  const { data: prof } = await admin.from('profiles').select('full_name').eq('id', ctx.b.renter_id).single()
  const renterName = (prof as { full_name?: string } | null)?.full_name || 'A guest'
  const hostEmail = await emailOf(ctx.boat.host_id)
  await resend.emails.send({
    from: FROM, to: [hostEmail, OPS_INBOX].filter(Boolean) as string[],
    subject: `✅ Booking confirmed — ${f.boatName} · ${f.date}`,
    html: shell('✅ New confirmed booking', '#22c55e', `
      <p><strong style="color:#f4f4f2">${renterName}</strong> booked <strong style="color:#f4f4f2">${f.boatName}</strong> and paid in full. Here are the details:</p>
      <table style="width:100%;border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:6px 0;color:#8b94a3">Boat</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${f.boatName}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Location</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${location}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Date</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${f.date}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Time</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${f.time}${f.dur ? ` · ${f.dur}` : ''}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Guests</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${ctx.b.guests_count}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Guest</td><td style="padding:6px 0;color:#f4f4f2;text-align:right;font-weight:600">${renterName}</td></tr>
        <tr><td style="padding:6px 0;color:#8b94a3">Total paid</td><td style="padding:6px 0;color:#74cfe8;text-align:right;font-weight:800">${f.money}</td></tr>
      </table>
      <p style="margin:18px 0 6px">${btn(`${SITE}/host/bookings`, 'View in dashboard →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">The guest has paid — get the boat ready for ${f.date}.</p>`),
  }).catch(() => {})
  await sendWhatsApp(await phoneOf(ctx.boat.host_id),
    `✅ *Booking confirmed!*\n${renterName} booked *${f.boatName}*\n${f.date} ${f.time}${f.dur ? ` (${f.dur})` : ''} · ${ctx.b.guests_count} guests · ${f.money}\n📍 ${location}\nManage: ${SITE}/host/bookings`)
}

/** Someone sent a chat message → email + WhatsApp the other participant so they don't miss it. */
export async function sendNewMessageAlert(conversationId: string, senderId: string, body: string, boatId: string | null, participantIds: string[]) {
  const { data: sp } = await admin.from('profiles').select('full_name').eq('id', senderId).single()
  const senderName = (sp as { full_name?: string } | null)?.full_name || 'Someone'
  let boatName = 'your booking'
  if (boatId) {
    const { data: bt } = await admin.from('boats').select('name').eq('id', boatId).single()
    boatName = (bt as { name?: string } | null)?.name || boatName
  }
  const url = `${SITE}/dashboard/messages?conversation=${conversationId}`
  for (const uid of (participantIds || [])) {
    const to = await emailOf(uid)
    if (!to) continue
    const self = uid === senderId
    await resend.emails.send({
      from: FROM, to,
      subject: self ? `💬 Your message — ${boatName}` : `💬 New message from ${senderName} — ${boatName}`,
      html: shell(self ? '💬 Message sent' : '💬 New message', '#74cfe8', `
        <p>${self ? 'Your message in the' : `<strong style="color:#f4f4f2">${senderName}</strong> sent a message in your`} <strong style="color:#f4f4f2">${boatName}</strong> conversation:</p>
        <p style="color:#cfd6df;font-style:italic;padding:12px 14px;background:#07101e;border-radius:12px;border:1px solid rgba(255,255,255,0.08);margin:12px 0">&ldquo;${body.slice(0, 400)}&rdquo;</p>
        <p style="margin:18px 0 6px">${btn(url, 'Open the conversation →')}</p>`),
    }).catch(() => {})
    if (!self) await sendWhatsApp(await phoneOf(uid),
      `💬 *New message* from ${senderName} about ${boatName}:\n"${body.slice(0, 200)}"\nReply: ${url}`)
  }
}

/** Guest submitted a request-to-book (priced) → confirm to the guest it's been sent. */
export async function sendBookerRequestReceived(bookingId: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const to = await emailOf(ctx.b.renter_id)
  if (to) await resend.emails.send({
    from: FROM, to, subject: `✅ Request received — ${f.boatName}`,
    html: shell('✅ Your request is in!', '#22c55e', `
      <p>Thanks! We&rsquo;ve sent your booking request for <strong style="color:#f4f4f2">${f.boatName}</strong> to the owner. They&rsquo;ll confirm availability, then we&rsquo;ll email you a secure payment link to lock it in.</p>
      ${detailRows(f)}
      <p style="margin:18px 0 6px">${btn(`${SITE}/dashboard`, 'View my request →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">No charge yet — you only pay once the owner accepts.</p>`),
  }).catch(() => {})
  await sendWhatsApp(await phoneOf(ctx.b.renter_id),
    `✅ *Request received* — ${f.boatName} · ${f.date} · ${ctx.b.guests_count} guests · ${f.money}.\nThe owner will confirm, then you'll get a payment link — no charge yet.\nTrack it: ${SITE}/dashboard`)
}

/** 24h before the trip → remind the guest their trip is coming up (email + WhatsApp). */
export async function sendTripReminder(bookingId: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const to = await emailOf(ctx.b.renter_id)
  if (to) await resend.emails.send({
    from: FROM, to, subject: `⏰ Reminder: your ${f.boatName} trip is tomorrow — ${f.date}`,
    html: shell('⏰ Your trip is coming up', '#74cfe8', `
      <p>Just a friendly reminder — your booking on <strong style="color:#f4f4f2">${f.boatName}</strong> starts in about <strong>24 hours</strong>. Here are your details:</p>
      ${detailRows(f)}
      <p>Please arrive 15 minutes early at the meeting point, bring a valid ID, and check the weather forecast. Reply to this email if anything's changed.</p>
      <p style="margin:18px 0 6px">${btn(`${SITE}/dashboard`, 'View my trip →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">See you on the water!</p>`),
  }).catch(() => {})
  await sendWhatsApp(await phoneOf(ctx.b.renter_id),
    `⏰ *Trip reminder* — your ${f.boatName} starts in ~24h!\n${f.date} ${f.time}${f.dur ? ` (${f.dur})` : ''} · ${ctx.b.guests_count} guests\nArrive 15 min early with a valid ID. Details: ${SITE}/dashboard\nSee you on the water!`)
}

/** Booking still unpaid 24h on → remind the guest to complete payment (email + WhatsApp). */
export async function sendPaymentReminder(bookingId: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx?.boat) return
  const f = fmt(ctx.b, ctx.boat.name)
  const to = await emailOf(ctx.b.renter_id)
  if (to) await resend.emails.send({
    from: FROM, to, subject: `💳 Complete your payment for ${f.boatName} — ${f.date}`,
    html: shell('💳 Payment still pending', '#f59e0b', `
      <p>Your booking for <strong style="color:#f4f4f2">${f.boatName}</strong> isn't confirmed yet because payment hasn't been completed. To secure your date, please complete payment soon — <strong>unpaid bookings are released after 48 hours</strong>.</p>
      ${detailRows(f)}
      <p style="margin:18px 0 6px">${btn(`${SITE}/dashboard`, 'Complete payment →')}</p>
      <p style="color:#8b94a3;font-size:12px;margin-top:14px">Already paid? You can ignore this — it can take a few minutes to update.</p>`),
  }).catch(() => {})
  await sendWhatsApp(await phoneOf(ctx.b.renter_id),
    `💳 *Payment pending* — your ${f.boatName} booking (${f.date}, ${f.money}) isn't confirmed yet.\nComplete payment to secure it — unpaid bookings are released after 48h:\n${SITE}/dashboard`)
}
