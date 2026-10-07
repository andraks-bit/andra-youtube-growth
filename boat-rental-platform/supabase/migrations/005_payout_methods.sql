-- 005_payout_methods.sql
-- Manual bank-transfer payout details collected from hosts while Stripe Connect is pending.
-- One payout method per host. This is SENSITIVE personal/financial data:
--   • RLS restricts every host to their own row.
--   • Admins read all rows only via the service-role key (server-side, admin-gated routes).
-- Supabase encrypts the database at rest (AES-256) by default.

CREATE TABLE IF NOT EXISTS public.payout_methods (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id                UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type            TEXT NOT NULL DEFAULT 'bank_transfer',
  account_holder_name    TEXT NOT NULL,                       -- exactly as on the bank account
  account_holder_type    TEXT NOT NULL DEFAULT 'individual',  -- 'individual' | 'company'
  account_holder_address TEXT,                                -- required for international (SWIFT) transfers
  bank_country           TEXT NOT NULL,                       -- ISO-2: ES, GR, EE, TH …
  bank_name              TEXT,
  iban                   TEXT,                                -- SEPA countries
  account_number         TEXT,                                -- non-IBAN countries (e.g. Thailand)
  swift_bic              TEXT,                                -- required for international (non-SEPA)
  routing_number         TEXT,                                -- US / others (optional)
  currency               TEXT NOT NULL DEFAULT 'EUR',
  is_sepa                BOOLEAN NOT NULL DEFAULT true,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_methods ENABLE ROW LEVEL SECURITY;

-- Hosts can read/insert/update/delete only their own payout method.
DROP POLICY IF EXISTS "payout_methods_owner_all" ON public.payout_methods;
CREATE POLICY "payout_methods_owner_all" ON public.payout_methods
  FOR ALL
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Note: the service-role key bypasses RLS and can read every row.
-- Keep it server-side only and rotate it if it has ever been exposed.
