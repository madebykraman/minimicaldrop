# MINIMICAL DROP

Private client upload portal for Minimical.

## Product

`drop.minimical.online` is the intended production hostname. The portal is designed so clients never receive Google Drive credentials. Each project maps to a private Google Drive folder, with temporary access, folder creation and large-file resumable uploads.

## Current milestone

The production backend foundation is implemented: server-side admin authentication, Supabase persistence, Google OAuth/Drive connection, tokenized client project routes, project creation, folder management, storage-limit checks, direct browser-to-Google resumable uploads, completion verification and audit events.

The visual client workspace remains intentionally a foundation and will be redesigned separately.

## Environment

- Next.js App Router
- Vercel
- PostgreSQL/Supabase
- Google Drive API + OAuth
- Server-only secrets

Never commit Google OAuth client secrets, refresh tokens, database credentials or service credentials.

See `docs/SETUP.md` for production setup.
