-- 007: Hardening and missing query indexes identified during application audit.
-- Apply on a maintenance window after reviewing the deployment; no data is deleted.
-- The app uses server-side service role access. RLS stays enabled with no
-- public policies on private client metadata/Drive token tables.

-- Lock down the function name resolution context (all application tables are
-- referenced with explicit public schema in the function bodies).
alter function public.reserve_upload(uuid, uuid, text, text, bigint, text)
  set search_path = '';
alter function public.touch_upload_activity(uuid, uuid)
  set search_path = '';

-- Foreign key lookups and audit history queries.
create index if not exists audit_events_project_created_idx
  on public.audit_events(project_id, created_at desc);
create index if not exists folders_parent_id_idx
  on public.folders(parent_id);
create index if not exists projects_drive_account_id_idx
  on public.projects(drive_account_id);
create index if not exists uploads_folder_id_idx
  on public.uploads(folder_id);
