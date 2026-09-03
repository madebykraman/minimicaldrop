# Minimical Drop Phase 5

Phase 5 adds delivery workflow polish and a studio delivery operations surface.

Client portal:
- Search and sorting
- Multi-select and bulk actions
- Upload queue with retry
- Resumable interrupted uploads
- Drag and drop
- Keyboard search shortcut
- Media and document previews
- Client-facing delivery status and message

Studio:
- `/admin/ops` delivery operations control room
- Client-facing delivery state: in progress, ready, delivered, archived
- Client message field
- Recent project activity
- Project health and expiry visibility

Database:
- Run `supabase/migrations/005_phase5_project_workflow.sql` before using delivery metadata.
