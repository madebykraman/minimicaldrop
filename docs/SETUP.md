# MINIMICAL DROP setup

## 1. Google Cloud

Create a Google Cloud project, enable the Google Drive API, configure the OAuth consent screen, and create a Web OAuth client.

Authorized redirect URI:

`https://drop.minimical.online/api/google/callback`

The application requests Drive access server-side. Keep the client secret and refresh tokens out of GitHub. Google recommends storing refresh tokens in secure long-term storage for continued API access. The Drive API supports resumable uploads for large files and upload progress.

## 2. Supabase

Create a Supabase project and run `supabase/schema.sql` in the SQL editor with RLS enabled. Apply migrations in order when upgrading an existing database.

The current production metadata key is `SUPABASE_SECRET_KEY`. Never prefix it with `NEXT_PUBLIC_`.

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
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` (optional)
- `CRON_SECRET`

For a quick MVP, `ADMIN_PASSWORD` can be used instead of `ADMIN_PASSWORD_HASH`, but it remains server-only and should not be committed.

Generate a SHA-256 password hash without sharing the password with ChatGPT:

`node -e "const c=require('crypto'); console.log(c.createHash('sha256').update(process.argv[1]).digest('hex'))" "YOUR_PASSWORD"`

Use Vercel Environment Variables for production secrets. Redeploy after changing variables.

## 4. Domain

Add `drop.minimical.online` to the Vercel project and create the DNS record Vercel provides at the domain registrar/DNS host.

## 5. First Drive connection

Open `/admin`, sign in with `ADMIN_EMAIL` and the configured admin password, then use **Connect Drive**. The resulting refresh token is stored in the `drive_accounts` table. Do not paste Google credentials into source files or chat.

## 6. Create a client project

From `/admin`, create a project with its name, client name, optional email, expiry date and storage limit. MINIMICAL DROP creates a dedicated folder in the configured Drive root and returns a tokenized client URL. Share that URL with the client.

Client links use `/u/<token>`. The raw token is only returned when a link is generated; the database stores a SHA-256 hash.

## Upload architecture

The client requests a Drive resumable session from the server. The server verifies the project and target folder, atomically reserves the requested storage against the project row, creates the session against the selected Drive folder and returns the session URL. The browser uploads 1 MB chunks directly to Google's resumable upload endpoint, avoiding Vercel request-body limits for large footage files. Completion is verified against Drive metadata before the upload is marked complete.

Interrupted uploads are retained as active records with their resumable session URL and activity timestamp. Reopening the project discovers recoverable sessions; selecting the same file again resumes from Google's confirmed byte offset. Sessions older than 24 hours are abandoned by the cleanup job.

## Production security

The application sets HTTPS, no-sniff, referrer, frame, permissions and HSTS headers. `/admin` and `/u/*` are marked `noindex` and `no-store`. Client tokens are validated against a strict 43-character base64url format and only their SHA-256 hashes are stored.

Project, folder and file operations validate ownership before touching Drive. File IDs are restricted to Drive's opaque ID character set. Upload reservations enforce the project quota under a database row lock, so concurrent upload initiations cannot both overrun the configured limit.

Public client endpoints also have an application-level short-window rate guard. Because serverless memory is not a global counter, use Vercel Firewall/WAF as the production edge control as well. Recommended rule: rate-limit requests to `/api/*` by IP, with a threshold appropriate to the expected client traffic, and add a stricter rule for authentication if your plan supports multiple rules. Vercel's WAF applies rules at the edge and supports rate limiting and managed protections.

Preview deployments should be protected with Vercel Deployment Protection so unfinished builds are not publicly accessible. Production should use the custom domain.

## Cleanup cron

`vercel.json` schedules `/api/internal/cleanup-uploads` daily at `03:00 UTC`. The route accepts Vercel's authenticated cron request and requires `CRON_SECRET`. It marks upload records with no activity for 24 hours as failed and clears their resumable session URL.

## Privacy

A public privacy page is available at `/privacy`. Crawlers are disallowed through `robots.ts`, while sensitive project and admin paths additionally receive `X-Robots-Tag: noindex, nofollow, noarchive`.
