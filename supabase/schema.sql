create extension if not exists pgcrypto;

create table if not exists drive_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  google_email text not null,
  refresh_token text not null,
  root_folder_id text,
  quota_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text not null,
  client_email text,
  access_token_hash text not null unique,
  drive_account_id uuid references drive_accounts(id) on delete restrict,
  drive_folder_id text not null,
  storage_limit_bytes bigint,
  expires_at timestamptz not null,
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references folders(id) on delete cascade,
  name text not null,
  drive_folder_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  drive_file_id text,
  session_url text,
  name text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  status text not null default 'initiated' check (status in ('initiated','uploading','complete','failed','deleted')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  last_activity_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  event_type text not null,
  file_name text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists projects_access_token_hash_idx on projects(access_token_hash);
create index if not exists folders_project_parent_idx on folders(project_id, parent_id);
create index if not exists uploads_project_idx on uploads(project_id);
create index if not exists uploads_project_status_created_idx on uploads(project_id, status, created_at);
create index if not exists uploads_status_activity_idx on uploads(status, last_activity_at);

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
