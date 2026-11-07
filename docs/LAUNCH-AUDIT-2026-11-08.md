# MinimicalDrop — Launch polish and source audit
Date: 2026-11-08

## Release intent
Production UI stabilization, no new features, no database migration, no
credential or project data changes. Main is the only branch targeted for release.

## Findings and fixes
- The Control Room brand text overlapped because a legacy
  `.finder-admin-sidebar-brand > div` selector imposed the icon's fixed
  37px dimensions on the copy wrapper. Copy now uses a separate intrinsic
  text element; studio CSS explicitly sizes only the icon.
- Admin pages injected approximately 12 kB of old `.p5-` CSS *after*
  shared styles via the `AdminStyles` JSX component. Structural rules are
  now in `app/admin/p5-base.css` before final Finder polish CSS.
- Repeated "Control Room" chrome was simplified into a single Finder
  window bar, retaining active count and logout.
- The project settings, storage, Drive connection, and activity cards now
  use named CSS grid areas and mobile single-column layout.
- Old admin/delivery accents and generated script palettes were normalized
  from purple/dark to the shared blue and neutral system.
- Removed unmounted global chrome, unused legacy client workspace,
  unused old homepage CSS, and two redundant build-time patch stages.
- Preserved three active build-time transformations required for resumable
  uploads, navigation/upload recovery, and optimistic deletion.
- No changes to Supabase schema, Google OAuth credentials, client file
  ownership checks, project creation, or upload API routes.

## Security posture checked
- Admin login checks the configured `ADMIN_EMAIL` and password; no
  public sign-up handler exists.
- Admin project/overview/delivery management routes use `isAdmin()`
  and the separate `/admin/ops` page requires the signed session.
- Google OAuth connect/callback are admin-session restricted.
- Invalid client project tokens must remain inaccessible.
- Background cleanup uses its cron secret, independent of the admin login.

## Validation expected before production
- Build contracts and automated tests must pass on the final preview commit.
- Next.js TypeScript compilation and Vercel READY status.
- Public homepage and admin login HTTP 200, health HTTP 200.
- Unauthenticated `/admin/ops` must resolve to the login page.
- Invalid client project token must return 404.
- Preview CSS must include the final admin copy/grid rules and no legacy
  primary purple accents in active shared styles.
- After main release, production SHA and domain alias must match and
  backend records must remain present.

## Boundaries and residual risks
- Static source audit and route smoke checks are not equivalent to a
  browser matrix or authenticated end-to-end UI testing. Verify editing a
  real project, navigating a real client folder, creating a folder, and
  uploading once in a trusted browser session before declaring full
  operational acceptance.
- Some legacy client upload/deletion source is still transformed at build
  time; retain contract tests and avoid removing those transforms without
  first committing their generated output to source.
- Dependencies use `latest` and no committed lockfile. Before future
  major dependency upgrades, capture exact versions and a reviewed lockfile.
- Per-instance login rate limiting is not a distributed attack control.
  Configure appropriate Vercel Firewall/WAF limits for public endpoints.

## Operational policy
No public admin registration. No additional product features unless a
concrete user need emerges. Subsequent updates should target defects,
accessibility, performance and security rather than extra UI controls.
