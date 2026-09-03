# MINIMICAL DROP

Private client file delivery infrastructure for Minimical.

## Product

`drop.minimical.online` is the production hostname. Clients receive a temporary project URL and never receive Google Drive credentials. Each project maps to an isolated Drive folder while Supabase stores the application state and activity trail.

## Architecture

Admin → Project → Client workspace → Collect / Work / Deliver → storage.

Google Drive is the current storage adapter, not the client-facing product. The client only sees MINIMICAL DROP.

## v0.2 milestone

The operational layer is implemented:

- Atomic storage reservations under a project row lock
- 8 MB browser upload chunks with resumable Drive sessions
- Interrupted upload recovery
- Daily abandoned-upload cleanup
- Project enable/disable, expiry, storage and client-link lifecycle
- Nested folder creation, rename and deletion
- Secure file download, metadata and inline preview for common media
- File and folder ownership validation
- Audit events for project, folder, upload, download and deletion activity
- Client and admin rate guards plus production security headers
- Branded operations control room
- Branded responsive client workspace

## v0.4 milestone

Delivery intelligence is implemented on top of the operational layer:

- Rich delivery states: in progress, ready for review, changes requested, approved, delivered and archived
- Client approval and change requests
- Project-level comments and studio messages
- Client and admin activity timelines
- Delivery history through the existing audit trail

Transactional email support remains optional infrastructure and is not required for the core product.

## v0.5 milestone

Studio efficiency is implemented without changing the client-facing product model:

- Studio overview with project health and operational metrics
- Aggregate storage usage and reservation visibility
- Search across projects and clients
- Project and client history surfaced from the audit trail
- One-click duplication into a fresh client workspace with a new secure token and Drive folder
- Richer project health visibility including file counts, usage and expiry proximity

Templates, automated reminders and separate archive-management machinery are intentionally deferred.

## 1.0 milestone

1.0 is the mature internal infrastructure release. The product surface is complete and the release pass is focused on reliability, recovery, security and launch readiness.

- Graceful application and global error recovery surfaces
- Production response security hardening and private no-store handling
- Production health, build and runtime verification path
- Auditable project and delivery lifecycle
- Secure server-side admin and hash-only client token access
- Google Drive kept entirely behind the storage boundary
- Production scripts aligned with the supported Next.js build flow
- Smooth client workspace interaction motion and faster resumable upload transport

## Product boundary

Drop belongs to Minimical. It supports Minimical clients as part of the service experience. There is no public registration, multi-tenant SaaS machinery or Slack-like collaboration layer.

Google Drive stays invisible to clients.

## Current surface

The existing Drop layout and interaction model remain intact. Branding uses the approved typography, gradients and bundled assets. Private surfaces include client Contact Support with a preformatted email handoff, plus Privacy and Terms links.

There is no client onboarding tour or welcome flow.

## Storage model

Supabase is the source of truth for project state and metadata. Google Drive stores the binary content. The storage boundary is deliberately kept behind server-side Drive helpers so another storage adapter can be introduced later without changing the client contract.

## Environment

- Next.js App Router
- Vercel
- PostgreSQL/Supabase
- Google Drive API + OAuth
- Optional Resend transactional email integration
- Server-only secrets

Never commit Google OAuth client secrets, refresh tokens, database credentials or service credentials.

See `docs/SETUP.md` for production setup and security configuration.
