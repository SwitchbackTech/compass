# Attendee-support ledger

Manager-owned. Update at every handoff. Do not append narrative; change
the row. Conversations are not the source of truth.

Status: `queued` | `running` | `waiting` | `verifying` | `done` |
`escalated`

When taking a WP, put `started_at: <UTC ISO timestamp>` at the front of
the evidence cell; replace it with real evidence when finishing. The
3-hour concurrency guard in [`README.md`](README.md) reads that
timestamp.

## In-flight work

| task_id | priority | owner | status | artifact | evidence | next_deadline | retry | approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PACK-WRITE | high | planning-session | done | `wip/attendee-support/` | this directory exists; WPs have finish lines and session prompts; plan approved by product owner 2026-08-25 | — | 0 | user, 2026-08-25 |
| WP-01 | high | manager-loop | done | [WP-01-core-write-contracts.md](WP-01-core-write-contracts.md) | 2026-08-25: test:core 605 pass; type-check/lint/knip exit 0 (re-run on final tree); test:web 2331 pass; test:sync:fast 361 pass; backend:fast 20 failures identical to baseline 65452e3 (pre-existing env, unrelated). Full evidence in WP file | — | 0 | none |
| WP-02 | high | manager-loop | done | [WP-02-sync-attendee-writes.md](WP-02-sync-attendee-writes.md) | 2026-08-26: test:sync 1017 pass 0 fail (78 files, safety-canary green, re-run on final tree); type-check/lint/knip exit 0 (lint: 0 errors, 10 pre-existing warnings). mergeAttendees merges by email vs freshly fetched provider state; replace threaded through single update, series edit-all, and create; organizer guard fails typed pre-fetch; matchesIntendedEdit compares email sets on replace only; preserve byte-identical (regression-tested). Full evidence + deltas in WP file | — | 0 | none |
| WP-03 | high | manager-loop | done | [WP-03-backend-write-path.md](WP-03-backend-write-path.md) | 2026-08-26: test:backend 390 pass 1 skip 8 fail — identical 8 (config x3, UserController x5) fail on base with work stashed (pre-existing env; +16 new passing tests, re-run on final tree); test:core 605 pass; type-check/lint/knip exit 0 (lint: 0 errors, 10 pre-existing warnings). Legacy keys pinned pre-change and byte-stable post-change (update:0b7c2048…, delete:b65cb278…); legacy replace submit request byte-identical (full-literal snapshot); attendees→needsAction + attendeesEdit replace; invitation threaded at create/update/delete (delete via query param); ATTENDEES_UNSUPPORTED 403 gate before any submit; optimistic response events carry intended attendees. Full evidence + deltas in WP file | — | 0 | none |
| WP-04 | high | manager-loop | done | [WP-04-web-attendee-editor.md](WP-04-web-attendee-editor.md) | 2026-08-26: test:web 2362 pass 0 fail (312 files, +30 new tests); type-check/lint/knip exit 0 (lint: 0 errors, 10 pre-existing warnings). test:a11y: default 30s timeout fails 6/7 with axe frame.evaluate timeouts IDENTICALLY on base (container env); all 7 pass at --timeout=180000 on the final tree. AttendeeField chips gate on writable-Google + organizer + non-occurrence; guest-changed saves prompt Send/Don't send (all/none); scope dialog narrows recurring guest edits to All Events; optimistic needsAction merge + rollback; wire boundary passes genuine guest edits and strips replays (MSW-proven). Full evidence + recurring-UX choice in WP file | — | 0 | none |
| WP-05 | medium | manager-loop | done | [WP-05-contacts-scope-and-suggestions.md](WP-05-contacts-scope-and-suggestions.md) | 2026-08-26: test:sync 1052 pass 0 fail (81 files, safety-canary green incl. new People patterns, re-run on final tree); test:core 615 pass; type-check/lint/knip exit 0 (lint: 0 errors, 10 pre-existing warnings); test:web 2364 pass; backend:fast 20 failures identical to WP-01 baseline (pre-existing env). Required lists untouched and literal-pinned (web GOOGLE_AUTH_SCOPES_REQUIRED, backend GOOGLE_AUTH_SCOPES, sync GOOGLE_SCOPES, e2e REQUIRED_SCOPES); begin features:["contacts"] adds both scopes, plain begin byte-identical; suggestContacts from either granted contacts scope; ContactsPort + google-people adapter (scope-gated surfaces, merge+rank); GET /internal/contacts/suggestions returns {email,displayName}[] only, 403 typed without grant, empty 200 under 2 chars; explicit sign-in-succeeds-without-contacts tests (backend+web). Full evidence + deltas in WP file | — | 0 | user, 2026-08-25 (optional sensitive scopes) |
| WP-06 | medium | manager-loop | done | [WP-06-contacts-surface.md](WP-06-contacts-surface.md) | 2026-08-26: test:web 2388 pass 0 fail (316 files, +24 new tests); test:core 618 pass; test:backend 406 pass 1 skip 8 fail — identical pre-existing WP-03 baseline (config x3, UserController x5; IPv4 shim env, +16 new passing); type-check/lint/knip exit 0 (lint: 0 errors, 10 pre-existing warnings). e2e oauth --timeout=180000: both NEW contacts tests pass (granted → capability true; denied → sign-in completes, connection HEALTHY, capability false, no insufficientScopes); pre-existing spinner test fails IDENTICALLY on base (env timing). Required scope lists untouched (diff-empty on all four). Proxy degrades every sync failure to typed empty 200; canSuggestContacts sync capability → summary → metadata → web; 250ms-debounced ranked suggestions via TanStack + command-palette scorer; nudge frequency rule pinned in contact-nudge.gate.test.ts. Full evidence + deltas in WP file | — | 0 | none |
| WP-07 | high | manager-loop | running | [WP-07-rsvp-sync.md](WP-07-rsvp-sync.md) | started_at: 2026-08-26T08:38:49Z | after WP-02 `done` | 0 | none |
| WP-08 | high | — | queued | [WP-08-rsvp-surface.md](WP-08-rsvp-surface.md) | — | after WP-03 and WP-07 `done` | 0 | none |
| WP-09 | medium | — | queued | [WP-09-e2e-docs-closeout.md](WP-09-e2e-docs-closeout.md) | — | after WP-04, WP-06, WP-08 `done` | 0 | none |

## Escalation log

| date | task_id | decision required | recommended option | alternatives tried | cost of waiting | safest default |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |
