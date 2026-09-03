# MINIMICAL DROP setup

## 1. Google Cloud

Create a Google Cloud project, enable the Google Drive API, configure the OAuth consent screen, and create a Web OAuth client.

Authorized redirect URI:

`https://drop.minimical.online/api/google/callback`

The application requests Drive access server-side. Keep the client secret and refresh tokens out of GitHub. Google recommends storing refresh tokens in secure long-term storage for continued API access. The Drive API supports resumable uploads for large files and upload progress.

## 2. Supabase

Create a Supabase project and run `supabase/schema.sql` in the SQL editor with RLS enabled.

For an existing Phase 1/2 installation, run these migrations once, in order:

- `supabase/migrations/002_phase1.sql`
- `supabase/migrations/003_reconcile_storage.sql`
- `supabase/migrations/004_upload_recovery.sql`

Use the current server-only secret key in Vercel as `SUPABASE_SECRET_KEY`. Never prefix it with `NEXT_PUBLIC_`.

## 3. Vercel

Set these production environment variables:

- `NEXT_PUBLIC_APP_URL=https://drop.minimical.online`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://drop.minimical.online/api/google/callback`
- `GOOGLE_DRIVE_SCOPE=https://www.googleapis.com/auth/drive`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH` (SHA-256 hex of the admin password; preferred)
- `SESSION_SECRET`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` (optional if the connected Drive account stores its own root folder ID)
- `CRON_SECRET` (random server-only secret used by the abandoned-upload cleanup job)

For a quick MVP, `ADMIN_PASSWORD` can be used instead of `ADMIN_PASSWORD_HASH`, but it remains server-only and should not be committed.

Generate a SHA-256 password hash without sharing the password with ChatGPT:

`node -e "const c=require('crypto'); console.log(c.createHash('sha256').update(process.argv[1]).digest('hex'))" "YOUR_PASSWORD"`

Use Vercel Environment Variables for production secrets. Redeploy after changing variables.

The repository includes a daily Vercel Cron job at `/api/internal/cleanup-uploads`. It marks `initiated` and `uploading` records with no activity for 24 hours as abandoned and removes their resumable session URL. Keep `CRON_SECRET` configured in Vercel so the endpoint cannot be called anonymously.

## 4. Domain

Add `drop.minimical.online` to the Vercel project and create the DNS record Vercel provides at the domain registrar/DNS host.

## 5. First Drive connection

Open `/admin`, sign in with `ADMIN_EMAIL` and the configured admin password, then use **Connect Google Drive**. The resulting refresh token is stored in the `drive_accounts` table. Do not paste Google credentials into source files or chat.

## 6. Create a client project

From `/admin`, create a project with its name, client name, optional email, expiry date and storage limit. MINIMICAL DROP creates a dedicated folder in the configured Drive root and returns a tokenized client URL. Share that URL with the client.

Client links use `/u/<token>`. The raw token is stored only in the generated client URL; the database stores a SHA-256 hash.

## Upload architecture

The client requests a Drive resumable session from the server. The server verifies the project and target folder, checks the project storage limit atomically, creates the session against the selected Drive folder and returns the session URL. The browser uploads 1 MB file chunks directly to Google's resumable upload endpoint, avoiding Vercel request-body limits for large footage files. Completion is verified against Drive metadata before the upload is marked complete.

Interrupted uploads retain their server-side session record while active. The recovery endpoint can discover recent resumable sessions and query Google for their current byte offset. Google Drive resumable sessions themselves expire after one week, while DROP treats 24 hours without activity as abandoned and cleans the record through the scheduled cleanup job.
