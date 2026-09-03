-- Phase 5: studio workflow metadata for client delivery.
-- Run in Supabase SQL Editor before deploying the matching application changes.

alter table public.projects
  add column if not exists delivery_status text not null default 'in_progress'
    check (delivery_status in ('in_progress','ready','delivered','archived')),
  add column if not exists client_message text;

create index if not exists projects_delivery_status_idx
  on public.projects(delivery_status);

-- Keep the canonical schema useful for fresh installs.
-- Existing projects intentionally remain in_progress.
