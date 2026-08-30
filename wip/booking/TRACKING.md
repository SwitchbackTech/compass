# Compass Booking ledger

Manager-owned. Update at every handoff. Do not append narrative; change
the row. Conversations are not the source of truth.

Status: `queued` | `running` | `waiting` | `verifying` | `done` |
`escalated`

When taking a WP, put `started_at: <UTC ISO timestamp>` at the front of
the evidence cell; replace it with real evidence when finishing. The
3-hour concurrency guard in [`README.md`](README.md) reads that
timestamp.

GitHub issues are filled in after they are opened (PACK-WRITE).

## In-flight work

| task_id | priority | owner | status | artifact | evidence | next_deadline | retry | approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PACK-WRITE | high | planning-session | done | `wip/booking/` + `docs/features/booking.md` | this directory exists; WPs have finish lines and session prompts; spec approved by product owner 2026-08-30 | — | 0 | user, 2026-08-30 |
| WP-01 | high | — | queued | [WP-01-booking-contracts.md](WP-01-booking-contracts.md) | | | 0 | none |
| WP-02 | high | — | queued | [WP-02-occupancy-honesty.md](WP-02-occupancy-honesty.md) | | | 0 | none |
| WP-03 | high | — | queued | [WP-03-persistence-and-slug.md](WP-03-persistence-and-slug.md) | | | 0 | none |
| WP-04 | high | — | queued | [WP-04-slot-engine.md](WP-04-slot-engine.md) | | | 0 | none |
| WP-05 | high | — | queued | [WP-05-calendar-application-interface.md](WP-05-calendar-application-interface.md) | | | 0 | none |
| WP-06 | high | — | queued | [WP-06-public-booking-api.md](WP-06-public-booking-api.md) | | | 0 | none |
| WP-07 | high | — | queued | [WP-07-host-settings-ui.md](WP-07-host-settings-ui.md) | | | 0 | none |
| WP-08 | high | — | queued | [WP-08-public-booking-page.md](WP-08-public-booking-page.md) | | | 0 | none |
| WP-09 | medium | — | queued | [WP-09-e2e-docs-closeout.md](WP-09-e2e-docs-closeout.md) | | | 0 | none |

## Escalation log

| date | task_id | decision required | recommended option | alternatives tried | cost of waiting | safest default |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |
