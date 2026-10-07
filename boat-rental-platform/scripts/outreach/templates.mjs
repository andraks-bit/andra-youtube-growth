// Outreach email templates (EN / ES). Plain, honest, personalized, opt-out included.
// {{company}}, {{firstName}}, {{location}}, {{boat}}, {{unsubscribeUrl}}, {{senderName}}, {{senderPhone}}
// are interpolated by send.mjs.

export const templates = {
  first: {
    en: {
      subject: 'A new booking channel for {{company}} in {{location}} — 15% fee, no exclusivity',
      text: `Hi {{firstName}},

I'm {{senderName}} from BoatHire24 (boathire24.com), a new boat-rental
marketplace focused on the Costa del Sol. I came across {{company}} and your
{{boat}} in {{location}} and would love to feature you.

We bring renters through local search and send them straight to your boats:
  - 15% platform fee (lower than the 20%+ common elsewhere)
  - Fast automated payouts via Stripe
  - We build your listings and photos for you (free, founding-host offer)
  - No exclusivity — it's simply extra bookings alongside your other channels

Could I send a 2-minute overview, or give you a quick call this week?

Best regards,
{{senderName}}, {{senderTitle}}
BoatHire24 · {{senderPhone}} · boathire24.com

—
You received this because {{company}} publicly lists this address for business
enquiries. If you'd rather not hear from us, unsubscribe here: {{unsubscribeUrl}}`,
    },
    es: {
      subject: 'Un nuevo canal de reservas para {{company}} en {{location}} — 15% de comisión',
      text: `Hola {{firstName}}:

Soy {{senderName}}, de BoatHire24 (boathire24.com), un nuevo marketplace de
alquiler de barcos centrado en la Costa del Sol. Hemos visto {{company}} y su
{{boat}} en {{location}} y nos encantaría incluirles.

Llevamos clientes desde la búsqueda local directamente a sus barcos:
  - 15% de comisión (más baja que el 20%+ habitual en otras plataformas)
  - Pagos rápidos y automáticos vía Stripe
  - Creamos sus anuncios y fotos (gratis, oferta de socio fundador)
  - Sin exclusividad — son reservas adicionales a sus otros canales

¿Le envío un resumen de 2 minutos o le llamo esta semana?

Un saludo,
{{senderName}}, {{senderTitle}}
BoatHire24 · {{senderPhone}} · boathire24.com

—
Recibe este mensaje porque {{company}} publica esta dirección para consultas
comerciales. Si no desea más mensajes, dese de baja aquí: {{unsubscribeUrl}}`,
    },
  },

  followup: {
    en: {
      subject: 'Re: A new booking channel for {{company}}',
      text: `Hi {{firstName}},

Just floating this back to the top of your inbox. Founding hosts get a reduced
10% fee for the first year and we handle the listing setup for you.

Happy to do a quick call — what suits you this week?

Best,
{{senderName}}
BoatHire24 · {{senderPhone}}

—
Unsubscribe: {{unsubscribeUrl}}`,
    },
    es: {
      subject: 'Re: Un nuevo canal de reservas para {{company}}',
      text: `Hola {{firstName}}:

Le escribo de nuevo por si se le traspapeló. Los socios fundadores tienen una
comisión reducida del 10% el primer año y nos encargamos de crear sus anuncios.

¿Le viene bien una llamada rápida esta semana?

Un saludo,
{{senderName}}
BoatHire24 · {{senderPhone}}

—
Darse de baja: {{unsubscribeUrl}}`,
    },
  },
}
