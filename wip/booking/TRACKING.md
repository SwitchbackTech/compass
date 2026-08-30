# Compass Booking ledger

Manager-owned. Update at every handoff. Do not append narrative; change
the row. Conversations are not the source of truth.

Status: `queued` | `running` | `waiting` | `verifying` | `done` |
`escalated`

When taking a WP, put `started_at: <UTC ISO timestamp>` at the front of
the evidence cell; replace it with real evidence when finishing. The
3-hour concurrency guard in [`README.md`](README.md) reads that
timestamp.

GitHub: milestone [Compass Booking v1](https://github.com/KeepSoftwareSimple/compass-calendar/milestone/7).
Org project create is blocked on `project` scope; see
[`GITHUB-PROJECT.md`](GITHUB-PROJECT.md).

## In-flight work

| task_id | priority | owner | status | artifact | evidence | next_deadline | retry | approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PACK-WRITE | high | planning-session | done | `wip/booking/` + `docs/features/booking.md` | this directory exists; WPs have finish lines and session prompts; spec approved by product owner 2026-08-30; issues #2970–#2978; milestone 7 | — | 0 | user, 2026-08-30 |
| WP-01 | high | cursor/booking-wp-01-booking-contracts-893c | done | [WP-01-booking-contracts.md](WP-01-booking-contracts.md) [#2970](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2970) | booking.contracts.ts + tests; bun test:core/type-check/lint/knip/verify PASS | | 0 | none |
| WP-02 | high | cursor/booking-wp-02-occupancy-honesty-893c | running | [WP-02-occupancy-honesty.md](WP-02-occupancy-honesty.md) [#2971](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2971) | started_at: 2026-08-30T22:01:00Z | | 0 | none |
| WP-03 | high | — | queued | [WP-03-persistence-and-slug.md](WP-03-persistence-and-slug.md) [#2972](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2972) | | | 0 | none |
| WP-04 | high | — | queued | [WP-04-slot-engine.md](WP-04-slot-engine.md) [#2973](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2973) | | | 0 | none |
| WP-05 | high | — | queued | [WP-05-calendar-application-interface.md](WP-05-calendar-application-interface.md) [#2974](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2974) | | | 0 | none |
| WP-06 | high | — | queued | [WP-06-public-booking-api.md](WP-06-public-booking-api.md) [#2975](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2975) | | | 0 | none |
| WP-07 | high | — | queued | [WP-07-host-settings-ui.md](WP-07-host-settings-ui.md) [#2976](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2976) | | | 0 | none |
| WP-08 | high | — | queued | [WP-08-public-booking-page.md](WP-08-public-booking-page.md) [#2977](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2977) | | | 0 | none |
| WP-09 | medium | — | queued | [WP-09-e2e-docs-closeout.md](WP-09-e2e-docs-closeout.md) [#2978](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2978) | | | 0 | none |

## Escalation log

| date | task_id | decision required | recommended option | alternatives tried | cost of waiting | safest default |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |
