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
  name text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  status text not null default 'initiated' check (status in ('initiated','uploading','complete','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
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
