# MINIMICAL DROP

Private client file delivery infrastructure for Minimical.

## Product

`drop.minimical.online` is the production hostname. Clients receive a temporary project URL and never receive Google Drive credentials. Each project maps to an isolated Drive folder while Supabase stores the application state and activity trail.

## Architecture

Admin → Project → Drive folder → private client token → browser upload → Google resumable upload → server verification → Supabase metadata.

Google Drive is the current storage adapter, not the client-facing product. The client only sees MINIMICAL DROP.

## v0.2 milestone

The operational layer is now implemented:

- Atomic storage reservations under a project row lock
- 1 MB browser upload chunks with resumable Drive sessions
- Interrupted upload recovery when the same file is selected again
- Daily abandoned-upload cleanup
- Project enable/disable, expiry, storage and client-link lifecycle
- Project archive without destroying Drive data
- Nested folder creation, rename and deletion
- Secure file download, metadata and inline preview for common media
- File and folder ownership validation
- Audit events for project, folder, upload, download and deletion activity
- Client and admin rate guards plus production security headers
- Noindex/no-store treatment for private surfaces
- Branded operations control room
- Branded responsive client workspace

## Storage model

Supabase is the source of truth for project state and metadata. Google Drive stores the binary content. The storage boundary is deliberately kept behind server-side Drive helpers so another storage adapter can be introduced later without changing the client contract.

## Environment

- Next.js App Router
- Vercel
- PostgreSQL/Supabase
- Google Drive API + OAuth
- Server-only secrets

Never commit Google OAuth client secrets, refresh tokens, database credentials or service credentials.

See `docs/SETUP.md` for production setup and security configuration.
