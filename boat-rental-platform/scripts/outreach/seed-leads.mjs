#!/usr/bin/env node
/**
 * Seed the outreach_leads table with the confirmed Costa del Sol operators
 * (contacts taken from each company's OWN public website contact page).
 * Leads without a verified email are intentionally omitted — verify them first.
 *
 * Usage: node scripts/outreach/seed-leads.mjs
 * Env:   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const leads = [
  { company: 'Marbella Boat Charter', location: 'Puerto Banús, Marbella', boat_type: 'Motor & sailing yachts / fishing / groups',
    email: 'info@marbellaboatcharter.com', phone: '+34 682 25 25 26', website: 'https://marbellaboatcharter.com',
    lang: 'en', priority: 'high', source: 'company website contact page', notes: 'Multi-boat fleet; EN/ES/FR; strong SEO.' },
  { company: 'Marbella Yacht Charter', location: 'Marbella (Muelle Ribera, Pier 4)', boat_type: 'Motor yachts',
    email: 'info@marbellayachtcharter.com', phone: '+34 644 25 51 76', website: 'https://marbellayachtcharter.com',
    lang: 'en', priority: 'high', source: 'company website contact page', notes: 'Puerto Banús yachts.' },
  { company: 'Eurosky Business S.L.', location: 'Puerto Banús, Pier 6', boat_type: 'Yacht rental with/without skipper',
    email: 'info@marbellarentayacht.com', phone: '+34 600 44 55 66', website: 'https://marbellarentayacht.com',
    lang: 'es', priority: 'high', source: 'company website contact page', notes: 'Registered S.L.; Rezdy booking system.' },
  { company: 'Maia Fair (Marbella Luxury Boat Charter)', location: 'Puerto Banús, Berth 092', boat_type: 'Luxury yacht (Sunseeker 68)',
    email: 'info@maiafair.com', phone: '+34 637 678 495', website: 'https://marbellaluxuryboatcharter.com',
    lang: 'en', priority: 'medium', source: 'company website contact page', notes: 'Premium single-yacht.' },
  { company: 'Nautica Marbella', location: 'Puerto Banús (Nueva Andalucía)', boat_type: 'Boats / fishing / catamarans / yachts',
    email: 'info@nauticamarbella.com', phone: '+34 607 79 65 65', website: 'https://www.nauticamarbella.com',
    lang: 'en', priority: 'high', source: 'company website contact page', notes: 'Since 1999; broad fleet; EN/ES.' },
  { company: 'Lovit Charter Boat', location: 'Puerto Banús, Pantalán 3', boat_type: 'Tours / parties / fishing / relax',
    email: 'lovitcharter@gmail.com', phone: '+34 692 364 352', website: 'https://lovitcharteraboat.com',
    lang: 'es', priority: 'medium', source: 'company website contact page', notes: 'Experiences-led; active socials.' },
  { company: 'South Olé Sails', location: 'Puerto de Estepona, Local 49', boat_type: 'Boat & jet ski rental / sailing school',
    email: 'office@southolesails.com', phone: '+34 625 774 063', website: 'https://www.southolesails.com',
    lang: 'en', priority: 'high', source: 'company website contact page', notes: 'Family-run; 4.9/5 from 900+ reviews; "no booking fees".' },
  { company: 'Ofblue Boat Charter Estepona', location: 'Puerto Deportivo de Estepona', boat_type: 'Charter w/ & w/o licence + experiences',
    email: 'info@ofblue.es', phone: '+34 626 621 538', website: 'https://esteponaboatrental.com',
    lang: 'es', priority: 'high', source: 'company website contact page', notes: 'Own fleet; 10+ yrs; Estepona→Marbella.' },
  { company: 'Boat Charter Puerto Banús', location: 'Puerto Banús (Muelle Príncipe Salman)', boat_type: 'Luxury yacht charter (3 sizes)',
    email: 'info@boatcharterpuertobanus.com', phone: '+34 602 482 560', website: 'https://www.boatcharterpuertobanus.com',
    lang: 'en', priority: 'medium', source: 'company website contact page', notes: 'Small premium fleet; broker-managed.' },
]

const { data, error } = await supabase
  .from('outreach_leads')
  .upsert(leads, { onConflict: 'email', ignoreDuplicates: true })
  .select()

if (error) { console.error('Seed failed:', error.message); process.exit(1) }
console.log(`Seeded/ensured ${leads.length} leads (inserted ${data?.length ?? 0} new).`)
