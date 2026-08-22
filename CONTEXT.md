# Fasi Law Chamber — Project Context

Working notes for anyone (human or AI) picking this codebase up. It records how
the system actually behaves, including the non-obvious parts and the traps that
have already cost real debugging time.

Last updated: 2026-08-17

---

## 1. What this is

A legal case-management system for Fasi Law Chamber, covering cases, hearings,
tasks, documents, expenses, a daily cause list scraped from the Telangana High
Court, and notifications.

It ships as **one codebase, two products**:

| | Web | Mobile |
|---|---|---|
| Build | `vite build` → `dist/` | same `dist/` wrapped by Capacitor |
| Served by | Flask (`proxy.py`) on Render | Android WebView |
| Origin | https://fasi-law-chamber.onrender.com | `https://localhost` |

## 2. Stack

- **Frontend**: React 18, TypeScript 5.6, Vite 6, Tailwind **3.4**, React Router 6
- **UI**: a small set of shadcn/ui components in `src/components/ui`, plus
  hand-written Tailwind on most pages
- **Backend**: Flask (`proxy.py`) + gunicorn, deployed on Render (free tier)
- **Database**: Supabase (Postgres + Realtime + Storage)
- **Mobile**: Capacitor 6 (Android generated; iOS not generated — needs macOS)
- **Package manager**: pnpm (Render runs **pnpm 10**, not the pinned 9)

## 3. Architecture traps — read before changing anything

### 3.1 Authentication does NOT use Supabase Auth

`AuthContext.login()` calls the `auth-login` edge function against a **custom
`users` table**, then stores the user in `localStorage`. The
`supabase.auth.signInWithPassword()` call beside it is best-effort and its error
is swallowed.

**Consequence:** every request reaches PostgREST as the **`anon`** role and
`auth.uid()` is NULL. Any RLS policy written `TO authenticated` or using
`auth.uid()` rejects everything. All policies in this repo target `anon`.

**Security note:** the anon key ships in the frontend bundle, so the database is
effectively open to anyone who opens devtools. Closing this means either issuing
real Supabase Auth sessions at login, or moving writes behind edge functions
using the service-role key. Not yet done.

### 3.2 The WebView origin is `https://localhost`

Capacitor 6 defaults `androidScheme` to `https`. Anything origin-sensitive —
above all the CORS allowlist in `proxy.py` — must include `https://localhost`,
not just `http://localhost`. Omitting it makes every request from the app fail
with "Failed to fetch".

### 3.3 `render.yaml` overrides the `Procfile`

Render uses `startCommand` from `render.yaml`; the `Procfile` is ignored. Any
gunicorn concurrency setting must live in `render.yaml`, which now runs
`--workers 2 --threads 4 --worker-class gthread`. With the previous default
(one sync worker) every backend request was serialized behind every other — the
single biggest cause of app-wide slowness.

### 3.4 A Capacitor WebView has no download manager and no print dialog

`<a download>` and `window.print()` silently do nothing on the phone. Use
`src/lib/download.ts` (`downloadBlob`, `saveHtmlDocument`, `canPrintToPdf`),
which writes a real file and opens the OS share sheet on native.

### 3.5 `window.open(url, '_blank', 'noopener')` returns **null**

Per spec. Passing `noopener` loses the handle, so nothing can be written into
the popup — this produced blank PDF exports. Never pass it for print windows.

### 3.6 External links need the system browser

A plain `target="_blank"` navigates the WebView itself, and `allowNavigation`
permits `*.onrender.com`, so tapping the site loaded it *inside* the app at the
login screen. Use `openExternal()` from `src/lib/openExternal.ts`.

## 4. Notifications — the whole picture

Three independent layers; all must work for a notification to reach a phone.

1. **Creation** — `notificationManager.send()` writes a row to `notifications`
   (per-user, or broadcast to all active users).
2. **Delivery** — `useNotificationListener` (mounted in `AuthContext`)
   subscribes to Supabase Realtime for `notifications` filtered by `user_id`.
   **Requires the table to be in the `supabase_realtime` publication.** If it is
   not, the subscription connects and then never fires — no error anywhere.
3. **Display** — `src/lib/notify.ts` → `@capacitor/local-notifications` on
   device, Web Notification API in a browser.

### Rules learned the hard way

- **Never notify from the sender's device.** Writing the row and popping a
  notification in the same handler notifies whoever performed the action, not
  the recipient. Delivery is the recipient's own subscription.
- **Write the database row before any backend call.** The row drives phone
  delivery; awaiting the slow WhatsApp/email backend first delayed it, and a
  throw meant the row was never written at all.
- **Android needs a monochrome `smallIcon`.** With none set, Capacitor falls
  back to `ic_launcher`, an adaptive icon, which Android cannot render as a
  small icon — it drops the notification with no error. See
  `android/app/src/main/res/drawable/ic_stat_notify.xml`.
- **Android needs an existing channel.** Notifications posted to a channel that
  was never created are discarded silently. The channel id is versioned
  (`fasi_alerts_v2`) because Android freezes a channel's importance after
  creation — a new id is the only way to ship corrected settings to a device
  that already installed the app.
- **Email notifications are OFF** by default. Set
  `EMAIL_NOTIFICATIONS_ENABLED=true` to re-enable them.

### Still missing: push to a closed app

Local notifications only fire while the app is running. WhatsApp-style delivery
needs FCM, which needs (a) `android/app/google-services.json` from a Firebase
project, (b) `VITE_ENABLE_PUSH=true`, and (c) real sending in `send_push()` in
`notification_routes.py`, **which is still a placeholder that logs and returns
success**. Push is deliberately opt-in: calling `PushNotifications.register()`
without Firebase config crashes the Android app natively on launch.

## 5. Database migrations — must be run by hand

There is no migration runner. These live in the repo root and are run in the
Supabase SQL editor. **Features stay broken until they are run.**

| File | Fixes |
|---|---|
| `supabase_fix_columns_rls_storage.sql` | `cases` date columns; `causelist_history` RLS; documents storage policy |
| `supabase_expenses_recurring.sql` | `is_recurring`, `recurrence_interval` on `expenses` |
| `supabase_enable_realtime_notifications.sql` | puts `notifications` in the realtime publication — **without this, phone notifications cannot work** |
| `supabase_remove_default_admin.sql` | step-by-step removal of the seeded admin (destructive; run manually) |
| `supabase_migration_add_dates.sql`, `supabase_indexes.sql` | older, superseded by the first file |

After any schema change run `NOTIFY pgrst, 'reload schema';` or PostgREST keeps
reporting the column as missing.

Where possible the app degrades rather than breaks — e.g. adding an expense
falls back to an insert without the recurring columns when they are absent.

## 5a. Primary key types are NOT uniform — check before writing an id

Confirmed from `information_schema`:

| column | type |
|---|---|
| `users.id` | **uuid** |
| `cases.id` | **bigint** |
| `cases.created_by` | uuid (matches `users.id`) |
| `expenses.case_id` | bigint (matches `cases.id`) |
| `expenses.submitted_by`, `expenses.approved_by` | uuid |
| `documents.uploaded_by` | uuid |
| `notifications.related_id` | uuid |
| `tasks.id`, `task_comments.task_id` | uuid |

So **user ids are UUIDs and case ids are bigints**. A case id written into any
uuid column fails the whole statement with
`invalid input syntax for type uuid: "1363"`. This is exactly what happened when
`notifyCaseChange` passed a case id as `relatedId` into `notifications.related_id`.

Rules:
- `notificationManager` stores a non-uuid reference in `metadata.related_ref`
  and leaves `related_id` NULL (`asUuidOrNull`).
- Case and expense inserts use `offendingUuidValue` + `stripOffendingFields`
  (`src/lib/uuid.ts`): if Postgres rejects a value as a bad uuid, only the field
  holding that value is dropped and the record still saves, with the field name
  logged. Never let a reference take down the user's whole form.
- Do not "fix" this by casting ids client-side. Check the column type first —
  `supabase_check_id_types.sql` prints all of them.

## 5b. Legal Doc Generator — server-side .docx template merge

`/legal-docs` (sidebar: "Legal Doc Generator") produces ready-to-file Word
documents — RTI applications, municipal representation letters, High Court IA
petitions, and Sec 528 BNSS quash petitions — in the chamber's standard
layout, filled from a form instead of retyped by hand.

**Architecture**: the four `.docx` files in `legal_templates/` are real Word
documents (built by `scripts/build_legal_templates.py` via `python-docx`)
carrying [docxtpl](https://github.com/elapouya/python-docx-template)/Jinja
tags as plain text. `legal_doc_engine.py` merges form data into a template
with `docxtpl` and returns bytes — it only ever substitutes text into
existing runs/paragraphs/table rows, never reconstructs a document, which is
what keeps the output "same to same" with the source layout instead of
scrambled. `legal_doc_routes.py` is a thin Flask blueprint
(`/api/legal-docs/generate`, `/api/legal-docs/types`) wrapping the engine, so
the merge logic itself is testable without booting Flask. The frontend posts
JSON and downloads the response through `src/lib/download.ts`
(`downloadBlob`) — **not** a plain `<a download>` link, which per §3.4 does
nothing at all in the Android WebView.

### Trap: docxtpl loop/if tags must be ALONE in their own paragraph or row

Verified directly against docxtpl 0.20.2 while building this (see
`scripts/build_legal_templates.py` docstring). A `{%p for %}` / `{%p endfor
%}` (or `{%tr for %}` / `{%tr endfor %}`, or the `if`/`endif` equivalents)
tag must be the *only* content in its own whole paragraph (or table row):

- **Wrong**: `{%tr for row in chrono %}{{ row.sno }}` in one table cell —
  docxtpl's XML patcher matches the entire enclosing `<w:tr>`/`<w:p>` element
  containing the tag and replaces the *whole thing* with the bare Jinja tag,
  silently deleting any data cells/text that shared that row or paragraph.
  No error is raised; the loop variable just renders as empty.
- **Right**: three separate paragraphs/rows — one containing only `{%p for
  x in items %}`, the next containing the actual templated content (this one
  repeats per iteration), and a third containing only `{%p endfor %}`.

This is exactly the kind of thing that looks like it should work and fails
silently, so party lists (petitioners/respondents), numbered paragraph lists
(grounds, information requested, affidavit paragraphs), and the chronology
table in the templates all follow the three-paragraph/row pattern. Party
formatting itself (name + relation + age + occupation + address, numbered,
with "...Petitioner"/"...Petitioners" only on the last row) is computed in
Python (`legal_doc_engine.format_party_line` / `format_party_list`) rather
than in Jinja expressions inside the XML, specifically so it stays unit
testable.

### Adding a fifth document type

1. Add a `build_x()` function to `scripts/build_legal_templates.py`
   following the existing loop/if pattern, run it to regenerate
   `legal_templates/*.docx`.
2. Add a `_build_x_context()` function to `legal_doc_engine.py` and register
   it in `_CONTEXT_BUILDERS`; add the template filename to
   `DOCUMENT_TEMPLATES` and a label to `DOCUMENT_LABELS`.
3. Add the matching TS field type + `defaultXFields()` to
   `src/lib/legalDocSchemas.ts`, and a form section to
   `LegalDocGeneratorPage.tsx` reusing `PartyRowsEditor` /
   `ParagraphListEditor` for any repeatable data.

**Out of scope for v1**: per-filing cover/index slips (Vakalath, Dispense
folio number strips) seen in the sample filings — those are administrative
filing-counter paperwork, not the substantive document content this feature
targets.

## 6. Performance notes

- Route-level code splitting in `App.tsx` keeps the initial bundle ~478 kB
  (125 kB gzip); it was 2.5 MB. Keep new pages `lazy()`.
- `recharts` (~460 kB) is confined to the Analytics chunk. Do not import it from
  a page that loads eagerly.
- `CasesPage` is virtualized (`TableVirtuoso` on desktop, `Virtuoso` on mobile)
  and paginated at 50 rows.
- User actions should be **optimistic**: update local state and close the modal
  first, await only the write that must succeed, and fire notifications and
  audit writes without awaiting.

## 7. Mobile UI conventions

- Wide tables render as cards below `md` via `RecordCard` / `RecordCardList`
  (`src/components/ui/record-card.tsx`). The tables themselves are
  `hidden md:block`.
- `<main>` in `DashboardLayout` carries `min-w-0` — a flex child defaults to
  `min-width: auto`, so without it any wide content drags the whole layout
  sideways. `overflow-x-hidden` is the backstop, which means **anything that
  overflows is clipped, not scrollable** — flex rows holding buttons need
  `min-w-0` on the text column and `shrink-0` on the buttons, or the buttons
  disappear on a phone.
- Modals present as bottom sheets under `sm`.
- Design tokens (`--muted`, `--border`, …) are defined in `src/index.css`. They
  were missing for a long time, which made the shadcn components render with
  invalid colours.

## 8. Repo layout

```
src/
  pages/          one file per route; the large ones are CaseFormPage,
                  CaseDetailsPage, TasksPage, DailyCauselistPage,
                  LegalDocGeneratorPage
  components/ui/  shadcn-style primitives (card, button, badge, alert, input,
                  separator, empty, record-card)
  components/legal-docs/ PartyRowsEditor, ParagraphListEditor — repeatable
                  form fields shared across the Legal Doc Generator's 4 types
  contexts/       AuthContext — also mounts push + notification listeners
  hooks/          useCapacitorPush, useNotificationListener, use-mobile
  lib/            supabase, api (BACKEND_URL), download, notify, openExternal,
                  notificationManager, notificationService, caseService, database,
                  legalDocSchemas, legalDocApi
proxy.py                Flask app: CORS, court-site scraping, static serving
notification_service.py WhatsApp (Twilio) + email
notification_routes.py  notification endpoints (send-push is a placeholder)
legal_doc_engine.py     Legal Doc Generator: form data -> rendered .docx (see §5b)
legal_doc_routes.py     Legal Doc Generator Flask blueprint (/api/legal-docs/*)
legal_templates/        the 4 source .docx templates (docxtpl tags), built by
                        scripts/build_legal_templates.py — don't hand-edit the
                        .docx files, edit the build script and re-run it
android/                Capacitor Android project (committed)
```

## 9. Verifying a change

```bash
npx tsc -b --noEmit     # must be 0 errors
npx eslint .            # 0 errors; ~20 exhaustive-deps warnings are known
npx vite build          # must succeed
npx cap sync android    # after any web change destined for the phone
```

`react-hooks/exhaustive-deps` warnings are left alone deliberately —
mechanically adding those dependencies causes infinite re-render loops here.

Before committing, check `git diff --cached --name-status --diff-filter=D`.
The `.sql` files have vanished from the working tree more than once (suspected
antivirus quarantine, given their `DROP`/`ALTER` content) and were committed as
deletions by `git add -A`.

## 10. Deploying

- **Web/backend**: push to `main`; Render builds via `build.sh`. Python changes
  (CORS, gunicorn, notification service) only take effect after that deploy
  completes.
- **Mobile**: `git pull && pnpm run cap:sync`, then build in Android Studio.
  The phone serves a *copy* of `dist/`, so web changes need a re-sync. Requires
  Android Studio + SDK; see `MOBILE_APP.md`.

## 11. Known open items

- Push to a closed app (needs Firebase + a real `send_push`).
- Anon-key exposure / RLS is wide open (§3.1).
- `send_push()` is a logging placeholder.
- ~40 unused dependencies in `package.json` (most `@radix-ui/*`, `tesseract.js`,
  `chart.js`, `zod`, …). Tree-shaken out of the bundle, but they slow installs
  and widen supply-chain surface — `@xmldom/xmldom`, which once broke the Render
  build, arrived through this tree.
- Case Lookup / Advocate Report accuracy depends on scraping
  `csis.tshc.gov.in`; the parsing lives in `proxy.py`.
- iOS project not generated (needs macOS + Xcode).
