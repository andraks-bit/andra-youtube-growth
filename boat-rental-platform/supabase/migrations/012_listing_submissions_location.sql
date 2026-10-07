-- Capture where the operator's boats are based on the /get-listed form.
alter table listing_submissions add column if not exists country text;
alter table listing_submissions add column if not exists port text;
