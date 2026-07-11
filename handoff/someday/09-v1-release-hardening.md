# 09 — Prove and release sub-calendars v1

## Goal

Turn the completed slices into a reliable v1 release and leave operators and
future agents with measurable acceptance evidence.

Depends on: all prior plans.

## Primary code anchors

The docs directories are lowercase on disk (`docs/acceptance`,
`docs/features`, `docs/self-hosting`, `docs/architecture`); use these exact
paths so links survive case-sensitive filesystems.

- `e2e/`
- `packages/scripts/src/migrations/`
- `docs/acceptance/events.md`
- `docs/acceptance/google-sync.md`
- `docs/features/google-sync-and-sse-flow.md`
- `docs/self-hosting/google-calendar.md`
- `docs/self-hosting/backup-and-restore.md`
- `docs/self-hosting/monitoring.md`

## Automated release gate

1. Run focused suites while implementing, then the complete affected matrix:
   `bun test:core`, `bun test:backend`, `bun test:web`, `bun test:scripts`,
   relevant Playwright specs, `bun type-check`, `bun lint`, and
   `bun run verify`.
2. Add contract tests that parse representative Google CalendarList/Event
   responses and every backend calendar/event/SSE response with shared Zod.
3. Add migration tests from every supported legacy state: fresh database,
   pre-calendar schema, calendar migrated, `event_new` migration already
   recorded, partial backfill, and rerun.
4. Add fault tests for rate limit, network timeout, partial page, invalid sync
   token, watch creation failure, duplicate notification, process restart, and
   revoked access — including `invalid_grant` during scheduled maintenance,
   which must prune-and-notify, never delete Compass data (A29), and a
   contract test that every backend SSE publish site emits a `ServerMessage`
   union member (A27).
5. Run query explains and an import benchmark at 1, 5, and 25 calendars with a
   production-shaped event/recurrence distribution. Investigate any p95 query
   or render regression over 20% from the recorded baseline.
6. Use heap/RSS sampling during the largest migration/import fixture to prove
   memory is batch-bounded rather than proportional to total events.

## Manual acceptance runbook

Run with three Google calendars (one writer, one reader with a private event,
and one `freeBusyReader`) plus the Compass-local calendar:

1. New Google signup imports all eligible calendars and reports accurate counts.
2. Names, colors, primary status, and read-only state match Google.
3. Hide/show persists across reload and another session.
4. Create/edit/delete a timed, all-day, and recurring event on the secondary
   writable calendar; verify the correct Google calendar changes.
5. Reader events display but every edit surface is blocked. Private events show
   busy content, and the free/busy-only calendar shows availability periods
   without synthetic event actions or leaked details.
6. Google-side add/edit/delete appears in Compass on the right calendar.
7. Add, rename, hide, and remove a Google calendar; Compass reconciles it.
8. Expire/delete a watch record, reopen the app, and verify automatic repair
   plus catch-up without duplicates.
9. Simulate a dropped notification and confirm the next incremental repair
   converges.
10. Exercise password-only/offline event creation, connect Google, and verify
    no local/someday data is lost.
11. Revoke Google access; Google data is pruned/disabled while Compass-local
    data remains.
12. Check keyboard/screen-reader behavior and narrow/wide resizable sidebars.

## Migration and rollback rehearsal

Per A36 the production cutover happens exactly once, only after every gate in
this file passes on staging; until then the `Deploy Production` action is not
run and production stays on the pre-cutover release.

1. Restore a sanitized production-shaped backup into staging.
2. Record source counts/category hashes and create a fresh backup.
3. Run forward migrations without modifying old collections.
4. Verify data, indexes, sync records, and application smoke tests.
5. Rehearse the write pause and collection cutover.
6. Rehearse rollback to the untouched legacy collection and old application
   version; verify events are readable. State the accepted loss window in the
   release notes: writes made after the cutover are abandoned by a rollback,
   and the new collection is dumped first so they remain recoverable by hand
   (per the `02` runbook).
7. Repeat the forward cutover to prove idempotence.
8. Document exact commands in `docs/Self-Hosting/backup-and-restore.md` and the
   release notes. Never include real credentials or user event content.

## Observability and operations

- Structured import summaries by user hash/calendar count and outcome.
- Watch state/repair action, lease contention, cooldown, and catch-up outcome.
- Google request operation, attempt count, final status, and duration—never
  token, event payload, email, or raw Google calendar id.
- Counters for active/expected watches, import failures, 410 resets, quota
  retries, and repair fallbacks.
- A self-host check that warns when the webhook URL is not public HTTPS.

## Documentation updates

- Architecture domain model and Google sync/SSE flow.
- Updated schema and user-journey diagrams archived from epic #530.
- Acceptance docs for events and Google sync.
- Self-hosting Google Calendar, monitoring, backup/restore, and upgrades.
- Development file map, testing playbook, migration recipe, and troubleshooting.
- Explain deferred v2 work: cross-calendar event moves, non-Google providers,
  shared-calendar administration, and per-event Google colors.

## Historical requirement audit

1. Verify every archived requirement in `00-project-ledger.md` maps to an
   implemented plan checkbox or an explicit no-work disposition.
2. Record implementation commit/PR links in the relevant Markdown packet, not
   in a reopened GitHub issue.
3. Treat the `01`–`09` exit criteria and this release gate as the only v1
   completion signal.

## Final exit criteria

- [ ] Automated, performance, fault, accessibility, and manual gates pass.
- [ ] Forward migration and rollback were both rehearsed successfully.
- [ ] Operator/developer/user-facing docs describe the shipped behavior.
- [ ] Every Project 6 card has a recorded final disposition.
- [ ] This Markdown set contains the durable requirement and implementation
      history for every Project 6 card.

Suggested commit: `docs(release): finalize sub-calendar v1 runbook`
