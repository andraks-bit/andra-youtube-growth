// Lightweight Twilio WhatsApp sender (no SDK — just the REST API).
// No-ops cleanly until TWILIO_* env vars + a recipient phone are present,
// so it's safe to wire in now and "switch on" the moment creds are added.
export async function sendWhatsApp(toPhone: string | null | undefined, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  // Accept the From with or without the "whatsapp:" prefix — a very common config slip
  // (storing just "+14155238886" makes Twilio reject the POST with no message created).
  const fromRaw = (process.env.TWILIO_WHATSAPP_FROM || '').trim()
  const from = fromRaw ? (fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:${fromRaw.startsWith('+') ? fromRaw : '+' + fromRaw}`) : ''
  if (!sid || !token || !from || !toPhone) return

  const clean = toPhone.trim().replace(/\s+/g, '')
  const to = clean.startsWith('whatsapp:') ? clean : `whatsapp:${clean.startsWith('+') ? clean : '+' + clean}`

  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    // best-effort — never block the booking flow on a WhatsApp hiccup
  }
}
