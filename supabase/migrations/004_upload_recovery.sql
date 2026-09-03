-- Phase 3: recoverable upload activity and stale-session cleanup support.
-- Run this once in the Supabase SQL Editor after 003_reconcile_storage.sql.

alter table public.uploads
  add column if not exists last_activity_at timestamptz not null default now();

update public.uploads
   set last_activity_at = coalesce(completed_at, created_at, now())
 where last_activity_at is null;

create index if not exists uploads_status_activity_idx
  on public.uploads(status, last_activity_at);

create or replace function public.touch_upload_activity(p_upload_id uuid, p_project_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_updated integer;
begin
  update public.uploads
     set last_activity_at = now()
   where id = p_upload_id
     and project_id = p_project_id
     and status = 'uploading';

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke execute on function public.touch_upload_activity(uuid, uuid) from public;
revoke execute on function public.touch_upload_activity(uuid, uuid) from anon;
revoke execute on function public.touch_upload_activity(uuid, uuid) from authenticated;
grant execute on function public.touch_upload_activity(uuid, uuid) to service_role;
