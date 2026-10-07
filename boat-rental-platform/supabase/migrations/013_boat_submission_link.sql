-- Link a managed boat back to the lead/customer it belongs to, so the leads
-- view can group "N boats" under each operator (e.g. Leon Beling's fleet).
alter table boats add column if not exists submission_id uuid;
create index if not exists boats_submission_id_idx on boats(submission_id);
