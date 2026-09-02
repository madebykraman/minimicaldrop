# MINIMICAL DROP setup

## 1. Google Cloud

Create a Google Cloud project, enable Google Drive API, configure the OAuth consent screen, and create a Web OAuth client.

Authorized redirect URI:

`https://drop.minimical.online/api/google/callback`

For local development use the equivalent localhost callback.

The application requests Drive access server-side. Keep the client secret and refresh tokens out of GitHub. Google recommends storing refresh tokens in secure long-term storage for continued API access. The Drive API supports resumable uploads for large files and upload progress.

## 2. Supabase

Create a Supabase project and run `supabase/schema.sql` in the SQL editor.

The service-role key is server-only and must never use a `NEXT_PUBLIC_` prefix.

## 3. Vercel

Set these production environment variables:

- `NEXT_PUBLIC_APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_DRIVE_SCOPE`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`

Use Vercel Environment Variables for production secrets. Redeploy after changing variables.

## 4. Domain

Add `drop.minimical.online` to the Vercel project and create the DNS record Vercel provides at the domain registrar/DNS host.

## 5. First Drive connection

After deployment, the private admin flow will use `/api/google/connect` to authorize the Google Drive account. The resulting refresh token is stored in the `drive_accounts` table. Do not paste Google credentials into source files or chat.

## Upload architecture

The client requests a Drive resumable session from the server. The server creates that session against the selected Drive folder and returns the session URL. The browser then uploads the file data directly to Google's resumable upload endpoint, avoiding Vercel request-body limits for large footage files.
