-- v0.4: delivery intelligence
-- Apply after 005_phase5_project_workflow.sql.

alter table public.projects drop constraint if exists projects_delivery_status_check;
alter table public.projects add constraint projects_delivery_status_check
  check (delivery_status in ('in_progress','ready','ready_for_review','changes_requested','approved','delivered','archived'));

update public.projects set delivery_status = 'ready_for_review' where delivery_status = 'ready';

create index if not exists audit_events_project_created_idx
  on public.audit_events(project_id, created_at desc);

-- Comments are intentionally project-level. They live in the same audit trail as
-- approvals, status changes and messages so delivery history remains chronological.
-- metadata shape for comments: { role: 'client'|'studio', author: string, body: string }
