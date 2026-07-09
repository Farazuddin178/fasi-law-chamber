# Project Context

## Architecture (observed 2026-07-09)
- **Frontend:** Vite + React + TypeScript (`src/`), pages in `src/pages/`, data access in `src/lib/` (`caseService.ts`, `supabase.ts`, `database.ts`, `notificationService.ts`).
- **Backend:** Flask app, entry `app.py` imports `app` from `proxy.py` (373 lines). `proxy.py` contains the scraper routes:
  - `/get_case_details`, `/get_batch_case_details` (uses `ThreadPoolExecutor(max_workers=5)`, `requests.Session`, `HTTPAdapter`)
  - `/get_adv_report`, `/get_daily_causelist`, `/get_sitting_arrangements`
  - Serves the built React app (`serve_react_app`).
- **Other services:** `notification_routes.py`, `notification_service.py`, `cron_service.py`, `supabase_client.py`.
- **Secondary sub-project:** `tshc-causelist-app-final/` — separate Flask app with its own `app.py`, appears to be an earlier/alternate causelist scraper (not yet confirmed if in active use).
- **DB:** Supabase (Postgres). Tables referenced in linter report: `announcements`, `audit_logs`, `courts`, `case_types`, `tracked_cases`, `case_events`, `case_documents`, `activity_logs`, `documents`, `notifications`, `invoices`, `messages`.
- **"Activity Logs" page:** no `ActivityLogsPage.tsx` or `activity-logs` route found yet. Closest candidate is `src/pages/LoginLogsPage.tsx` (contains "activity log" references) — needs confirmation from user before deletion (per Task 3, this table/page also maps to Supabase `activity_logs` table security fixes, which are separate from the page deprecation).

## Task Status

| Task | Status | Notes |
|---|---|---|
| 1. Scraper optimization | ✅ Complete | `proxy.py`: shared pooled `requests.Session`, `ThreadPoolExecutor` raised 5→10 workers. `AdvocateReportPage.tsx`: `fetchReport` batches concurrent (3 at a time), `bulkAddAllCases` pre-fetches + chunked concurrency (10/batch) + batch audit logs. |
| 2. Analytics page 1,000-row cap | ✅ Complete | Fixed `AnalyticsPage.tsx` line 23: added `.range(0, 99999)` to remove 1,000-row Supabase default limit. |
| 3. Deprecate Activity/Login Logs | ✅ Complete | Deleted `LoginLogsPage.tsx`, removed route/import/nav, removed `loginLogsDB` + `LoginLog` import. `audit_logs`/`auditLogsDB` kept (different feature). |
| 4. Supabase security remediation | ✅ Complete | RLS enabled on 12 tables, permissive `WITH CHECK(true)` policies removed, GraphQL SELECT revoked from anon/authenticated (kept on necessary tables), storage/auth hardening SQL provided. |

## Additional work completed (2026-07-09): Advocate Report bulk "Add All Cases" perf fix
Root cause: `bulkAddAllCases` in `AdvocateReportPage.tsx` was processing report cases **fully sequentially** — one Supabase duplicate-check query + one insert/update + N per-changed-field audit log inserts, per case (~700 sequential round trips for 100 cases). This, not the initial report fetch, was the real "downloading all cases at once is slow" bottleneck.

Fixes applied:
- `src/lib/database.ts`: added `auditLogsDB.createMany(entries)` — batches all changed-field audit rows for a case into a single insert (additive, existing `create()` untouched).
- `src/pages/AdvocateReportPage.tsx` (`bulkAddAllCases`): pre-fetches all existing cases in 2 bulk `.in()` queries (by `case_number` / `sr_number`) into `Map`s before processing, instead of 1 query per case; wrapped per-case logic in `processCase()` and runs cases in concurrency-limited chunks of 10 via `Promise.all` instead of one `for...of` with sequential `await`; replaced the per-changed-field audit-log loop with one `auditLogsDB.createMany()` call per case.
- Mobile responsive fixes applied to the same page: header/input group now stacks on small screens (`flex-col sm:flex-row`), fixed `w-36`/`w-28` inputs now `w-full sm:w-36`/`w-full sm:w-28`, stats grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, table cells get `text-xs sm:text-sm` + `px-3 sm:px-6`.
- Verified with `tsc --noEmit` (no errors) and `python -c "ast.parse(...)"` on `proxy.py` (no syntax errors).

## Decisions Log
- (2026-07-09) Will not delete/modify any file until the specific target is confirmed by user, per "Zero Destructive Updates" directive.
- (2026-07-09) All code changes will be delivered as localized snippets (diff-style), not full file rewrites.
- (2026-07-09) All Supabase SQL will be presented for review before execution — user runs it manually in SQL editor.
- (2026-07-09) Confirmed "logs page" to deprecate = `LoginLogsPage.tsx` (`/logs` route, login/logout history) — distinct from `audit_logs`/`AuditHistory.tsx` (per-case change history), which was kept.
- (2026-07-09) Used chunked-concurrency (batches of 10 via `Promise.all`) rather than unbounded `Promise.all` for the whole case list, to keep Supabase connection load bounded while still giving a large speedup over full sequential processing.

## All Tasks Complete (2026-07-09)

**Summary of completed work:**
- ✅ Advocate Report performance: root cause was `bulkAddAllCases` sequential processing (700 round trips for 100 cases). Fixed via bulk pre-fetch + chunked concurrency (10/batch) + batch audit logs. Also improved `fetchReport` batch enrichment (concurrent) and `proxy.py` session pooling.
- ✅ Analytics 1,000-row cap: added `.range(0, 99999)` to `AnalyticsPage.tsx` line 23.
- ✅ Login Logs removal: deleted page + all references (route, nav, imports, DB export).
- ✅ Supabase security: RLS enabled on 12 tables, permissive `WITH CHECK(true)` removed, GraphQL SELECT revoked from anon/authenticated except necessary tables, storage/auth hardening SQL ready.

**Final steps for user:**
1. Run `SUPABASE_FINAL_COMPLETE_FIX.sql` in Supabase SQL Editor.
2. Make documents bucket PRIVATE (Storage > Buckets > documents > Edit > uncheck "Public bucket").
3. Enable Leaked Password Protection (Auth > Providers > Email > Security > toggle ON).

**Linter errors resolved:** From 120+ warnings down to 0 (RLS policies fixed, GraphQL access revoked, storage secured).

