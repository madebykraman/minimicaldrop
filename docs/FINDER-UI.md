# Finder-inspired UI rebuild

This revision rebuilds the client workspace and studio admin as a coherent, responsive,
Mac-style file manager while retaining the existing service-layer calls, Google
Drive storage, Supabase records, project tokens, and upload/recovery logic.

## Client workspace

- Light, softly translucent desktop window with traffic-light decoration,
  consistent Minimical purple accents, large whitespace and rounded cards.
- Persistent navigation: **All files**, **Folders**, **Recent (current folder)**,
  **Transfers**, **Storage**. The sidebar becomes an off-canvas panel below 700px.
- True **grid and list modes**; chosen mode is saved in browser local storage.
- Breadcrumb navigation and Back control, Search (Cmd/Ctrl+K), Sort, Select all,
  New folder, Upload files, Refresh, multi-select bulk download and delete.
- Cards contain real open, download, rename and delete actions; folder and file
  icons communicate type. File preview types stay restricted by the safety
  allowlist from the security audit.
- Drag-and-drop uploads, interrupted-upload recovery, quota progress, upload
  activity, delivery approval/conversation, support dialog, and failure notices
  remain available; no changes to the storage protocol.
- Accessible labels, 44px touch targets, visible focus, reduced-motion settings,
  and responsive breakpoints at 1160 / 860 / 700 / 390px.

## Admin control room

- Finder-style window header and left sidebar: Projects, Active, Archived/inactive,
  Connect Drive and Refresh.
- Project **card grid and list mode** (preference saved locally), search and
  filter, status badges, metadata and open-project controls.
- Project details retain expiry, storage, client link regeneration, notifications,
  audit history and archiving. The project creation modal and login receive
  the same light design.
- Delivery intelligence and Studio overview sliding panels are restyled, not removed.
- Responsive layouts at 1080 / 750 / 460px.

## Technical notes

- Scoped design layer is `app/finder-ui.css` and imported from `app/layout.tsx`.
- The legacy CSS and build-time source rewriting remain in place to preserve
  existing behaviors. The Finder CSS uses higher-specificity, route-scoped rules.
- The UI is on its own review branch to permit isolated QA; no production
  deployment/merge or database changes are required to review the Vercel preview.
- Existing audits and security fixes are inherited from the audit PR branch.
- `scripts/check-build-contracts.cjs` now verifies new UI controls, style imports
  and responsive styles, in addition to the previous upload/recovery checks.

## Acceptance checklist

- [ ] Mobile widths 360, 390 and 430px: sidebar opens/closes; grid cards and
      primary controls fit without horizontal scrolling; modals stay scrollable.
- [ ] Tablet 768px and 1024px: toolbar wraps correctly and list view remains usable.
- [ ] Desktop 1440px: rounded window, sidebar, cards, project settings and
      support overlays align correctly.
- [ ] Grid/list toggles work and persist across reload.
- [ ] All files (root), Folders, Recent, Transfers, Storage, breadcrumbs and
      Back navigation work on a real client project.
- [ ] Search, sorting, select all, bulk download, single preview/rename/delete
      and nested folder creation continue to work.
- [ ] Zero-byte, image, PDF and a large resumable upload; test interrupted
      recovery and quota exceeded messages.
- [ ] Delivery comment, approve and request changes still work.
- [ ] Admin sign in, new project, project details, expiry, storage limit,
      link regeneration, archive and Google Drive reconnect still work.
- [ ] Test support mailto and the Studio Overview / Delivery Intelligence panels.

## Rollout

Preview build and TypeScript checks are necessary but **not sufficient** to
certify every interactive control or pixel alignment. Use a test client project
and a real browser/device matrix before merging to production. Apply any
database migrations separately through change control.
