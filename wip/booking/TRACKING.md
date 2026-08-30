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
| WP-02 | high | cursor/booking-wp-02-occupancy-honesty-893c | done | [WP-02-occupancy-honesty.md](WP-02-occupancy-honesty.md) [#2971](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2971) | isOccurrenceBusy from providerMetadata transparency; bun test:sync (1096 pass, safety-canary green); type-check/lint/knip/verify PASS | | 0 | none |
| WP-03 | high | cursor/booking-wp-03-persistence-and-slug-893c | done | [WP-03-persistence-and-slug.md](WP-03-persistence-and-slug.md) [#2972](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2972) | booking_pages + booking_reservations collections; GET/PUT /api/booking/page; slug allocated once with sparse unique index + duplicate-key retry; GET before PUT returns virtual defaults without insert; bun test:backend/type-check/lint/knip/verify PASS | | 0 | none |
| WP-04 | high | cursor/booking-wp-04-slot-engine-893c | done | [WP-04-slot-engine.md](WP-04-slot-engine.md) [#2973](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2973) | compute-booking-slots.ts + tests; bun test:core/type-check/lint/knip/verify PASS | | 0 | none |
| WP-05 | high | cursor/booking-wp-05-calendar-port-893c | done | [WP-05-calendar-application-interface.md](WP-05-calendar-application-interface.md) [#2974](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2974) | CalendarBookingPort + createConference/guestsCanInviteOthers; safety-canary green; verify PASS | | 0 | none |
| WP-06 | high | — | queued | [WP-06-public-booking-api.md](WP-06-public-booking-api.md) [#2975](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2975) | | | 0 | none |
| WP-07 | high | cursor/booking-wp-07-host-settings-ui-893c | done | [WP-07-host-settings-ui.md](WP-07-host-settings-ui.md) [#2976](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2976) | Settings Booking page (duration, calendars, weekly hours, timezone, window, buffer, cap, guest-invite, copy link, connect-Google prompt); bun test:web/type-check/lint/knip/verify PASS | | 0 | none |
| WP-08 | high | cursor/booking-wp-08-public-booking-page-893c | done | [WP-08-public-booking-page.md](WP-08-public-booking-page.md) [#2977](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2977) | public /book routes outside calendar-shell; guest TZ slot picker, form, confirm, 409 refresh, 404/unavailable; PublicBookingPage.test.tsx; bun test:web/type-check/lint/knip/verify PASS | | 0 | none |
| WP-09 | medium | — | queued | [WP-09-e2e-docs-closeout.md](WP-09-e2e-docs-closeout.md) [#2978](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2978) | | | 0 | none |

## Escalation log

| date | task_id | decision required | recommended option | alternatives tried | cost of waiting | safest default |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |
