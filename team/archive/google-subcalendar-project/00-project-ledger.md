# Project 6 historical issue ledger

This ledger preserves every requirement from GitHub Project 6 after migration
to Markdown tracking. The project returned 25 cards on 2026-07-10: 12 open and
13 already completed.

All 12 formerly open issues were closed as `not planned` on 2026-07-10 because
Compass no longer uses GitHub issues to track this project. This is an
administrative closure, not implementation evidence. Progress and completion
are represented only by checkboxes and exit criteria in the linked plan files.

## Requirements migrated from formerly open issues

| Archived issue | GitHub state | Markdown source of truth |
| --- | --- | --- |
| [#1722 Repair Google watches proactively](https://github.com/SwitchbackTech/compass-calendar/issues/1722) | Closed, not planned, 2026-07-10 | `07-watch-repair-quota-and-retries.md`: scheduled maintenance and user-start health share the tested repair coordinator. Shipped in PRs #2058-#2060. |
| [#1138 Migrate codebase to use the updated event schema](https://github.com/SwitchbackTech/compass-calendar/issues/1138) | Closed, not planned, 2026-07-10 | `03-event-runtime-cutover.md`: remove legacy storage/runtime imports and user-owned event queries. Shipped in PRs #2017, #2019-#2034. |
| [#1135 Update Event Schema and Collection for Multi-Calendar & Multi-Provider Support](https://github.com/SwitchbackTech/compass-calendar/issues/1135) | Closed, not planned, 2026-07-10 | `01`, `02`, and `03`: strict contracts, safe backfill, runtime cutover, docs, and rollback proof. Shipped in PRs #2015 (01) · #2016, #2018 (02) · #2017, #2019-#2034 (03). |
| [#1070 Watch for Google calendar changes](https://github.com/SwitchbackTech/compass-calendar/issues/1070) | Closed, not planned, 2026-07-10 | `06-calendar-list-sync-and-watch-routing.md`: CalendarList notifications reconcile calendars, events, sync records, and watches. Shipped in PRs #2054-#2056. |
| [#1039 Baseline CalendarList migration](https://github.com/SwitchbackTech/compass-calendar/issues/1039) | Closed, not planned, 2026-07-10 | No implementation packet. CalendarList is legacy and incremental calendar migrations are authoritative. |
| [#1038 Baseline User migration](https://github.com/SwitchbackTech/compass-calendar/issues/1038) | Closed, not planned, 2026-07-10 | No implementation packet. The existing Umzug migration model is authoritative. |
| [#783 Create migrations for existing Compass schemas](https://github.com/SwitchbackTech/compass-calendar/issues/783) | Closed, not planned, 2026-07-10 | No baseline project. Each implementation packet adds only its targeted forward migration. |
| [#735 Migrate event schema to reference calendar collection `_id`](https://github.com/SwitchbackTech/compass-calendar/issues/735) | Closed, not planned, 2026-07-10 | Superseded by `01`, `02`, and `03`, which preserve all unique acceptance criteria. Shipped in PRs #2015 (01) · #2016, #2018 (02) · #2017, #2019-#2034 (03). |
| [#734 Add `calendarId` route parameter to GCal watch endpoint](https://github.com/SwitchbackTech/compass-calendar/issues/734) | Closed, not planned, 2026-07-10 | `06` tests the stronger existing route: verified stored watch identity provides the authoritative Google calendar id. Shipped in PRs #2054-#2056. |
| [#727 Add `quota user` to Google Calendar requests](https://github.com/SwitchbackTech/compass-calendar/issues/727) | Closed, not planned, 2026-07-10 | `07`: every Google call family uses one stable user value and centralized bounded retry behavior. Shipped in PRs #2058-#2060. |
| [#553 Update full import flow to include all sub-calendars](https://github.com/SwitchbackTech/compass-calendar/issues/553) | Closed, not planned, 2026-07-10 | `04`: all eligible calendars import with tokens, resume behavior, scale limits, and partial-failure tests. Shipped in PRs #2036, #2038, #2040, #2043. |
| [#530 Support Google sub-calendars](https://github.com/SwitchbackTech/compass-calendar/issues/530) | Closed, not planned, 2026-07-10 | Epic acceptance criteria are distributed across `01`–`09`; `09` is the v1 release gate. Packets 01-08 shipped in PRs: 01 #2015 · 02 #2016, #2018 · 03 #2017, #2019-#2034 · 04 #2036, #2038, #2040, #2043 · 05 #2046, #2049, #2050 · 06 #2054-#2056 · 07 #2058-#2060 · 08 #2062-#2066. `09` (this release gate) is in progress and not yet shipped. |

## Completed cards retained as prerequisites

| Historical issue | Current evidence | Plan action |
| --- | --- | --- |
| #1719 Deepen Google sync domain modules | Domain folders for import, Google sync, records, event propagation, public notification ingress, and watch lifecycle are merged. | Do not redo. Keep new work inside those owners. |
| #1136 Create new event schema/collection | `event_new.types.ts` and two 2025 migrations exist. | Treat as a prototype; correct forward because executed migrations are immutable. |
| #1117 Use watch collection | Sync services use `mongoService.watch`. | Preserve and extend. |
| #1100 Create watch collection | Zod schema, Mongo validation/index migration, and migration tests exist. | Extend only through new migrations. |
| #1065 Migrate CalendarList to calendar | Forward migration and tests exist. | Use as historical input; do not revive CalendarList storage. |
| #1064 Create calendar collection | Calendar collection validation and indexes exist. | Correct with forward migrations as the final contract evolves. |
| #1063 Create Compass Calendar schema | Shared Zod schema and Google mapper exist. | Extend for local calendars and strict API contracts. |
| #1044 Baseline Migration schema migration | Closed not planned on 2026-07-05. | No replacement work. |
| #1043 Baseline Seeder schema migration | Closed not planned on 2026-07-05. | No replacement work. |
| #1042 Baseline Sync schema migration | Closed not planned on 2026-07-05. | Targeted sync/watch migrations are the supported replacement. |
| #1041 Baseline Priority schema migration | Closed not planned on 2026-07-05. | No replacement work. |
| #1040 Baseline Event schema migration | Closed not planned on 2026-07-05. | The targeted calendar-owned event migration in `02` replaces it. |
| #715 Update backend tests for sub-calendars | Closed as too generic; calendar/watch/import tests exist. | Each implementation plan defines its focused missing coverage. |

## Coverage check

- [x] All 25 Project 6 cards appear in one of the two tables.
- [x] Requirements from all 12 formerly open cards have an implementation
  packet or an explicit no-work disposition.
- [x] All 12 formerly open GitHub issues are closed as `not planned`.
- [ ] Every implementation requirement in plans `01`–`09` is complete.
- [ ] The v1 release gate in `09-v1-release-hardening.md` passes.
