-- Phase 1: durable upload sessions and atomic storage reservations.
-- Run this once in the Supabase SQL Editor after schema.sql.

alter table public.uploads
  add column if not exists session_url text;

create index if not exists uploads_project_status_created_idx
  on public.uploads(project_id, status, created_at);

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
  v_used bigint;
  v_upload_id uuid;
begin
  if p_size_bytes < 0 then
    raise exception 'Upload size cannot be negative';
  end if;

  select storage_limit_bytes
    into v_limit
    from public.projects
   where id = p_project_id
   for update;

  if not found then
    raise exception 'Project not found';
  end if;

  select coalesce(sum(size_bytes), 0)
    into v_used
    from public.uploads
   where project_id = p_project_id
     and status in ('uploading', 'complete');

  if v_limit is not null and v_used + p_size_bytes > v_limit then
    raise exception 'This upload would exceed the project storage limit';
  end if;

  insert into public.uploads (
    project_id,
    folder_id,
    name,
    mime_type,
    size_bytes,
    status,
    session_url
  )
  values (
    p_project_id,
    p_folder_id,
    p_name,
    p_mime_type,
    p_size_bytes,
    'uploading',
    p_session_url
  )
  returning id into v_upload_id;

  return v_upload_id;
end;
$$;

revoke execute on function public.reserve_upload(uuid, uuid, text, text, bigint, text) from public;
revoke execute on function public.reserve_upload(uuid, uuid, text, text, bigint, text) from anon;
revoke execute on function public.reserve_upload(uuid, uuid, text, text, bigint, text) from authenticated;
grant execute on function public.reserve_upload(uuid, uuid, text, text, bigint, text) to service_role;
