-- Phase 3: recoverable upload activity and stale-session cleanup support.
-- Run this once in the Supabase SQL Editor after 003_reconcile_storage.sql.

alter table public.uploads
  add column if not exists last_activity_at timestamptz not null default now();

update public.uploads
   set last_activity_at = coalesce(completed_at, created_at, now())
 where last_activity_at is null;

create index if not exists uploads_status_activity_idx
  on public.uploads(status, last_activity_at);

create or replace function public.reserve_upload(
  p_project_id uuid,
  p_folder_id uuid,
  p_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_session_url text
)
returns uuid
language plpgsql
as $$
declare
  v_limit bigint;
  v_expires_at timestamptz;
  v_disabled_at timestamptz;
  v_used bigint;
  v_upload_id uuid;
begin
  if p_size_bytes < 0 then
    raise exception 'Upload size cannot be negative';
  end if;

  select storage_limit_bytes, expires_at, disabled_at
    into v_limit, v_expires_at, v_disabled_at
    from public.projects
   where id = p_project_id
   for update;

  if not found then
    raise exception 'Project not found';
  end if;

  if v_disabled_at is not null or v_expires_at <= now() then
    raise exception 'Project is unavailable or expired';
  end if;

  select coalesce(sum(size_bytes), 0)
    into v_used
    from public.uploads
   where project_id = p_project_id
     and status in ('uploading', 'complete');

  if v_limit is not null and v_used + p_size_bytes > v_limit then
    raise exception 'This upload would exceed the project storage limit';
  end if;

  insert into public.uploads (project_id, folder_id, name, mime_type, size_bytes, status, session_url, last_activity_at)
  values (p_project_id, p_folder_id, p_name, p_mime_type, p_size_bytes, 'uploading', p_session_url, now())
  returning id into v_upload_id;

  return v_upload_id;
end;
$$;

revoke execute on function public.reserve_upload(uuid, uuid, text, text, bigint, text) from public;
revoke execute on function public.reserve_upload(uuid, uuid, text, text, bigint, text) from anon;
revoke execute on function public.reserve_upload(uuid, uuid, text, text, bigint, text) from authenticated;
grant execute on function public.reserve_upload(uuid, uuid, text, text, bigint, text) to service_role;

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
