-- Phase 1 follow-up: distinguish externally deleted files from failed uploads.
-- Run this once in the Supabase SQL Editor.

alter table public.uploads drop constraint if exists uploads_status_check;
alter table public.uploads
  add constraint uploads_status_check
  check (status in ('initiated','uploading','complete','failed','deleted'));
