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
| WP-01 | high | manager-loop | running | [WP-01-core-write-contracts.md](WP-01-core-write-contracts.md) | started_at: 2026-08-25T22:09:30Z | when picked up: +1 session | 0 | none |
| WP-02 | high | — | queued | [WP-02-sync-attendee-writes.md](WP-02-sync-attendee-writes.md) | — | after WP-01 `done` | 0 | none |
| WP-03 | high | — | queued | [WP-03-backend-write-path.md](WP-03-backend-write-path.md) | — | after WP-01 `done` | 0 | none |
| WP-04 | high | — | queued | [WP-04-web-attendee-editor.md](WP-04-web-attendee-editor.md) | — | after WP-02 and WP-03 `done` | 0 | none |
| WP-05 | medium | — | queued | [WP-05-contacts-scope-and-suggestions.md](WP-05-contacts-scope-and-suggestions.md) | — | any time | 0 | user, 2026-08-25 (optional sensitive scopes) |
| WP-06 | medium | — | queued | [WP-06-contacts-surface.md](WP-06-contacts-surface.md) | — | after WP-04 and WP-05 `done` | 0 | none |
| WP-07 | high | — | queued | [WP-07-rsvp-sync.md](WP-07-rsvp-sync.md) | — | after WP-02 `done` | 0 | none |
| WP-08 | high | — | queued | [WP-08-rsvp-surface.md](WP-08-rsvp-surface.md) | — | after WP-03 and WP-07 `done` | 0 | none |
| WP-09 | medium | — | queued | [WP-09-e2e-docs-closeout.md](WP-09-e2e-docs-closeout.md) | — | after WP-04, WP-06, WP-08 `done` | 0 | none |

## Escalation log

| date | task_id | decision required | recommended option | alternatives tried | cost of waiting | safest default |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |
