-- ─── Verification & Admin ─────────────────────────────────────────────────

-- Add verification columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  ADD COLUMN IF NOT EXISTS verification_notes  TEXT,
  ADD COLUMN IF NOT EXISTS is_admin            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ;

-- Verification documents submitted by hosts
CREATE TABLE IF NOT EXISTS verification_documents (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type     TEXT        NOT NULL,   -- passport | company_registration | boat_registration | marina_contract | boat_insurance
  storage_path TEXT        NOT NULL,
  file_name    TEXT        NOT NULL,
  file_size    BIGINT,
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- Users can read/insert their own docs; admins can read all
CREATE POLICY "own_docs_select" ON verification_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own_docs_insert" ON verification_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin helper function — returns true if calling user is_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  )
$$;

-- Admins can read all docs
CREATE POLICY "admin_docs_select" ON verification_documents
  FOR SELECT USING (is_admin());

-- Index
CREATE INDEX IF NOT EXISTS verification_documents_user_id_idx ON verification_documents(user_id);
CREATE INDEX IF NOT EXISTS profiles_verification_status_idx    ON profiles(verification_status);
