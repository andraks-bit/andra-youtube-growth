'use client'

import Link from 'next/link'
import { ArrowRight, TrendingUp, CheckCircle2 } from 'lucide-react'

type Lang = 'en' | 'es' | 'fr' | 'it' | 'pt'

const COPY: Record<Lang, {
  eyebrow: string
  h1Pre: string
  h1Highlight: string
  sub: (city: string) => string
  cta1: string
  cta2: string
  outreachBanner: (city: string) => string
  benefits: { t: string; d: string }[]
  steps: { n: string; t: string; d: string }[]
  trustTitle: string
  trust: string[]
}> = {
  en: {
    eyebrow: 'You received our email — welcome',
    h1Pre: 'List your boat on',
    h1Highlight: 'BoatHire24',
    sub: (c) => c
      ? `We saw your boats in ${c}. List them on BoatHire24 to reach renters from across Europe, the US, and beyond. Free to start. You keep 85% of every booking.`
      : 'List your boats on BoatHire24 to reach renters worldwide. Free to start. You keep 85% of every booking.',
    cta1: 'Start listing — it’s free',
    cta2: 'How it works',
    outreachBanner: (c) => `Thanks for replying to our email${c ? ` about ${c}` : ''} — here’s the quick version.`,
    benefits: [
      { t: 'Free listing, no monthly fees', d: 'Only pay a 15% commission when a booking completes. No upfront cost.' },
      { t: 'Stripe-protected payments', d: 'Guests pay in advance via Stripe. Funds release to your bank 7 days after each charter.' },
      { t: 'You set the rules', d: 'Your prices, your calendar, your boat. Approve every booking or turn on instant book.' },
      { t: 'Global reach', d: '96 countries already in our directory. SEO landings, paid ads, and direct outreach bring you renters.' },
    ],
    steps: [
      { n: '01', t: 'Create your listing', d: 'Add photos, set prices and availability. ~10 minutes.' },
      { n: '02', t: 'Receive booking requests', d: 'Approve manually, or turn on instant book for more volume.' },
      { n: '03', t: 'Host the charter', d: 'Meet your guests. We handle payment + dispute support.' },
      { n: '04', t: 'Get paid', d: 'Stripe transfers earnings 7 days after each completed charter.' },
    ],
    trustTitle: 'Everything included, free',
    trust: ['Verified renter profiles', 'Stripe payment protection', 'Free listing, no upfront cost', 'Insurance framework', '24/7 host support', 'Calendar + pricing tools'],
  },
  es: {
    eyebrow: 'Recibiste nuestro email — bienvenido',
    h1Pre: 'Publica tus barcos en',
    h1Highlight: 'BoatHire24',
    sub: (c) => c
      ? `Vimos tus barcos en ${c}. Publícalos en BoatHire24 para llegar a clientes de toda Europa, EEUU y más. Gratis para empezar. Te quedas con el 85% de cada reserva.`
      : 'Publica tus barcos en BoatHire24 para llegar a clientes en todo el mundo. Gratis para empezar. Te quedas con el 85% de cada reserva.',
    cta1: 'Empezar — es gratis',
    cta2: 'Cómo funciona',
    outreachBanner: (c) => `Gracias por responder a nuestro email${c ? ` sobre ${c}` : ''} — versión corta abajo.`,
    benefits: [
      { t: 'Sin coste mensual', d: 'Solo 15% de comisión cuando se completa una reserva. Sin coste inicial.' },
      { t: 'Pagos protegidos con Stripe', d: 'Los clientes pagan por adelantado. Recibes el dinero 7 días tras cada charter.' },
      { t: 'Tú pones las reglas', d: 'Tus precios, tu calendario, tu barco. Aprueba cada reserva o activa reserva instantánea.' },
      { t: 'Alcance global', d: '96 países en nuestro directorio. SEO, ads y outreach directo te traen clientes.' },
    ],
    steps: [
      { n: '01', t: 'Crea tu anuncio', d: 'Sube fotos, pon precios y disponibilidad. ~10 minutos.' },
      { n: '02', t: 'Recibe solicitudes', d: 'Aprueba manualmente o activa reserva instantánea.' },
      { n: '03', t: 'Realiza el charter', d: 'Recibe a tus clientes. Nosotros gestionamos pagos y disputas.' },
      { n: '04', t: 'Cobra', d: 'Stripe te transfiere 7 días tras cada charter completado.' },
    ],
    trustTitle: 'Todo incluido, gratis',
    trust: ['Perfiles verificados', 'Pagos protegidos por Stripe', 'Publicación gratuita', 'Marco de seguros', 'Soporte 24/7', 'Herramientas de calendario y precios'],
  },
  fr: {
    eyebrow: 'Vous avez reçu notre email — bienvenue',
    h1Pre: 'Listez vos bateaux sur',
    h1Highlight: 'BoatHire24',
    sub: (c) => c
      ? `Nous avons vu vos bateaux à ${c}. Listez-les sur BoatHire24 pour toucher des clients dans toute l’Europe, les États-Unis et au-delà. Gratuit. Vous gardez 85% de chaque réservation.`
      : 'Listez vos bateaux sur BoatHire24 pour toucher des clients du monde entier. Gratuit. Vous gardez 85% de chaque réservation.',
    cta1: 'Commencer — c’est gratuit',
    cta2: 'Comment ça marche',
    outreachBanner: (c) => `Merci d’avoir répondu à notre email${c ? ` sur ${c}` : ''} — voici la version courte.`,
    benefits: [
      { t: 'Inscription gratuite', d: 'Seulement 15% de commission par réservation. Aucun frais initial.' },
      { t: 'Paiements protégés par Stripe', d: 'Les clients paient à l’avance. Versement 7 jours après chaque charter.' },
      { t: 'Vous décidez', d: 'Vos prix, votre calendrier, votre bateau. Approbation manuelle ou réservation instantanée.' },
      { t: 'Portée mondiale', d: '96 pays dans notre annuaire. SEO, publicité et prospection vous amènent les clients.' },
    ],
    steps: [
      { n: '01', t: 'Créez votre annonce', d: 'Photos, prix, disponibilité. ~10 minutes.' },
      { n: '02', t: 'Recevez des demandes', d: 'Validez manuellement ou activez la réservation instantanée.' },
      { n: '03', t: 'Accueillez', d: 'Rencontrez vos clients. Nous gérons paiements et litiges.' },
      { n: '04', t: 'Soyez payé', d: 'Stripe transfère 7 jours après chaque charter.' },
    ],
    trustTitle: 'Tout inclus, gratuit',
    trust: ['Profils vérifiés', 'Paiements Stripe', 'Inscription gratuite', 'Cadre d’assurance', 'Support 24/7', 'Outils de calendrier et tarifs'],
  },
  it: {
    eyebrow: 'Hai ricevuto la nostra email — benvenuto',
    h1Pre: 'Pubblica le tue barche su',
    h1Highlight: 'BoatHire24',
    sub: (c) => c
      ? `Abbiamo visto le tue barche a ${c}. Pubblicale su BoatHire24 per raggiungere clienti da tutta Europa, USA e oltre. Gratis. Tieni l’85% di ogni prenotazione.`
      : 'Pubblica le tue barche su BoatHire24 per raggiungere clienti in tutto il mondo. Gratis. Tieni l’85% di ogni prenotazione.',
    cta1: 'Inizia — è gratis',
    cta2: 'Come funziona',
    outreachBanner: (c) => `Grazie per aver risposto alla nostra email${c ? ` su ${c}` : ''} — versione breve qui sotto.`,
    benefits: [
      { t: 'Iscrizione gratuita', d: 'Solo 15% di commissione sulle prenotazioni completate. Nessun costo iniziale.' },
      { t: 'Pagamenti protetti Stripe', d: 'I clienti pagano in anticipo. Trasferimento 7 giorni dopo ogni charter.' },
      { t: 'Decidi tu', d: 'I tuoi prezzi, il tuo calendario, la tua barca. Approvazione manuale o prenotazione istantanea.' },
      { t: 'Portata globale', d: '96 paesi nella nostra directory. SEO, ads e outreach diretto ti portano clienti.' },
    ],
    steps: [
      { n: '01', t: 'Crea l’annuncio', d: 'Foto, prezzi, disponibilità. ~10 minuti.' },
      { n: '02', t: 'Ricevi richieste', d: 'Approva manualmente o attiva la prenotazione istantanea.' },
      { n: '03', t: 'Ospita', d: 'Incontra i clienti. Noi gestiamo pagamenti e dispute.' },
      { n: '04', t: 'Ricevi il pagamento', d: 'Stripe trasferisce 7 giorni dopo ogni charter.' },
    ],
    trustTitle: 'Tutto incluso, gratis',
    trust: ['Profili verificati', 'Pagamenti Stripe', 'Iscrizione gratuita', 'Quadro assicurativo', 'Supporto 24/7', 'Strumenti calendario e prezzi'],
  },
  pt: {
    eyebrow: 'Você recebeu nosso email — bem-vindo',
    h1Pre: 'Anuncie seus barcos no',
    h1Highlight: 'BoatHire24',
    sub: (c) => c
      ? `Vimos seus barcos em ${c}. Anuncie no BoatHire24 para alcançar clientes da Europa, EUA e mais. Grátis. Você fica com 85% de cada reserva.`
      : 'Anuncie seus barcos no BoatHire24 para alcançar clientes do mundo todo. Grátis. Você fica com 85% de cada reserva.',
    cta1: 'Começar — é grátis',
    cta2: 'Como funciona',
    outreachBanner: (c) => `Obrigada por responder ao nosso email${c ? ` sobre ${c}` : ''} — versão curta abaixo.`,
    benefits: [
      { t: 'Cadastro gratuito', d: 'Só 15% de comissão por reserva concluída. Sem custo inicial.' },
      { t: 'Pagamentos Stripe', d: 'Clientes pagam antes. Você recebe 7 dias após cada charter.' },
      { t: 'Você decide', d: 'Seus preços, seu calendário, seu barco. Aprovação manual ou reserva instantânea.' },
      { t: 'Alcance global', d: '96 países no diretório. SEO, ads e outreach trazem clientes.' },
    ],
    steps: [
      { n: '01', t: 'Crie seu anúncio', d: 'Fotos, preços, disponibilidade. ~10 minutos.' },
      { n: '02', t: 'Receba pedidos', d: 'Aprove manualmente ou ative reserva instantânea.' },
      { n: '03', t: 'Hospede', d: 'Receba seus clientes. Cuidamos de pagamentos e disputas.' },
      { n: '04', t: 'Receba', d: 'Stripe transfere 7 dias após cada charter.' },
    ],
    trustTitle: 'Tudo incluído, grátis',
    trust: ['Perfis verificados', 'Pagamentos Stripe', 'Cadastro grátis', 'Quadro de seguros', 'Suporte 24/7', 'Calendário e preços'],
  },
}

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'
const textMuted = 'rgba(244,244,242,0.55)'

export default function ListYourBoatClient({
  city, operatorDomain, isOutreach, lang,
}: { city: string; operatorDomain: string; isOutreach: boolean; lang: Lang }) {
  const t = COPY[lang] || COPY.en
  const listUrl = `/host/listings/new${city ? `?city=${encodeURIComponent(city)}` : ''}`

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      {/* Outreach banner — only shown when arriving from cold email */}
      {isOutreach && (
        <div style={{ background: 'linear-gradient(90deg, rgba(116,207,232,0.18), rgba(116,207,232,0.06))', borderBottom: `1px solid ${goldBorder}`, padding: '12px 16px', textAlign: 'center', fontSize: '14px', color: '#f4f4f2' }}>
          ✦ {t.outreachBanner(city)} {operatorDomain && <span style={{ color: textMuted, marginLeft: 8 }}>({operatorDomain})</span>}
        </div>
      )}

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 100, paddingBottom: 88 }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 90% 60% at 60% 0%, rgba(116,207,232,0.12) 0%, transparent 65%)' }} />
        <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 99, marginBottom: 28, background: goldFaint, color: gold, border: `1px solid ${goldBorder}` }}>
              <TrendingUp style={{ width: 13, height: 13 }} /> {t.eyebrow}
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 22 }}>
              {t.h1Pre}{' '}
              <span style={{ color: gold }}>{t.h1Highlight}</span>
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.7, marginBottom: 36, color: textMuted }}>
              {t.sub(city)}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href={listUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 99, fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', boxShadow: '0 8px 32px rgba(116,207,232,0.32)', textDecoration: 'none' }}>
                {t.cta1} <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
              <Link href="/how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 99, fontSize: 15, fontWeight: 600, border: `1px solid ${goldBorder}`, color: 'rgba(244,244,242,0.80)', background: 'transparent', textDecoration: 'none' }}>
                {t.cta2}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ padding: '64px 16px', borderTop: `1px solid ${goldBorder}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          {t.benefits.map((b, i) => (
            <div key={i} style={{ padding: 24, background: 'rgba(244,244,242,0.02)', border: `1px solid ${goldBorder}`, borderRadius: 14 }}>
              <h3 style={{ color: gold, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{b.t}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: textMuted }}>{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: '64px 16px', borderTop: `1px solid ${goldBorder}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {t.steps.map((s) => (
              <div key={s.n}>
                <div style={{ fontSize: 32, fontWeight: 800, color: gold, marginBottom: 8 }}>{s.n}</div>
                <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{s.t}</h4>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: textMuted }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section style={{ padding: '64px 16px', borderTop: `1px solid ${goldBorder}` }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 28, color: gold }}>{t.trustTitle}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, textAlign: 'left' }}>
            {t.trust.map((x) => (
              <div key={x} style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 14 }}>
                <CheckCircle2 style={{ width: 18, height: 18, color: gold, flexShrink: 0, marginTop: 2 }} /> {x}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '64px 16px', borderTop: `1px solid ${goldBorder}`, textAlign: 'center' }}>
        <Link href={listUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 40px', borderRadius: 99, fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', boxShadow: '0 8px 32px rgba(116,207,232,0.32)', textDecoration: 'none' }}>
          {t.cta1} <ArrowRight style={{ width: 16, height: 16 }} />
        </Link>
        <p style={{ marginTop: 20, fontSize: 12, color: textMuted }}>
          Andra Kiirkivi · Founder · BoatHire24 · <a href="mailto:info@boathire24.com" style={{ color: gold }}>info@boathire24.com</a>
        </p>
      </section>
    </div>
  )
}
