-- 006_add_gulet_boat_type.sql
-- Adds the 'gulet' value to the boat_type enum so hosts can list traditional
-- wooden gulets (multi-cabin crewed sailing yachts).
--
-- Run this in the Supabase SQL Editor. Postgres requires ALTER TYPE ... ADD VALUE
-- to run OUTSIDE a transaction block, so run this single statement on its own.
ALTER TYPE boat_type ADD VALUE IF NOT EXISTS 'gulet';
