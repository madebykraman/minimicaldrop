# MINIMICAL DROP

Private client upload portal for Minimical.

## Product

`drop.minimical.online` is the intended production hostname. The portal is designed so clients never receive Google Drive credentials. Each project maps to a private Google Drive folder, with temporary access, folder creation and large-file resumable uploads.

## Current milestone

The repository currently contains the responsive client workspace and interaction foundation. The next production layer is server-side authentication, project persistence, Google OAuth, Drive folder mapping and resumable uploads.

## Planned environment

- Next.js App Router
- Vercel
- PostgreSQL/Supabase
- Google Drive API + OAuth
- Server-only secrets

Never commit Google OAuth client secrets, refresh tokens, database credentials or service credentials.
