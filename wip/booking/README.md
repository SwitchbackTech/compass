# Compass Booking — work pack

Temporary project pack. Manager sessions execute the work packages (WPs)
in dependency order as **separate PRs to `main`**. Delete this entire
directory when the pack finish line holds and WP-09's docs have replaced
it as source of truth.

Do not re-litigate the design. The architecture decisions live in
[`00-context-and-invariants.md`](00-context-and-invariants.md) and the
product spec in [`docs/features/booking.md`](../../docs/features/booking.md),
approved by the product owner on 2026-08-30. If a WP's steps contradict
the code you find, prefer the code, note the delta in the WP's Evidence
section, and keep the WP's finish line intact.

GitHub: milestone [Compass Booking v1](https://github.com/KeepSoftwareSimple/compass-calendar/milestone/7)
([#2970](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2970)–[#2978](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2978)).
Org project create needs `project` scope: [`GITHUB-PROJECT.md`](GITHUB-PROJECT.md).
Agent-ready issues are linked from [`TRACKING.md`](TRACKING.md).

## How to pick up (manager-loop protocol)

1. Read this file, [`TRACKING.md`](TRACKING.md), and
   [`docs/features/booking.md`](../../docs/features/booking.md). Do not
   start from chat memory.
2. Concurrency guard: if any row is `running` with a `started_at`
   timestamp younger than 3 hours, stop — another session is working.
   Exit as a no-op. If the `running` row is older than 3 hours, treat it
   as abandoned: fill that WP's Handoff block from what you can observe,
   then take the WP over.
3. Take the first WP whose status is `queued` and whose dependencies are
   `done`. Set that row to `running` with yourself as `owner` and a UTC
   `started_at` timestamp in the evidence column. Commit and push the
   ledger update before implementing, so overlapping sessions see it.
4. Branch `cursor/booking-wp-NN-<short-name>-893c` from current
   `origin/main`. Implement only that WP. The finish line, steps,
   acceptance tests, and a paste-ready session prompt are in the WP file.
5. Validate before pushing: the changed package's test suite,
   `bun run type-check`, `bun lint`, `bun knip`. Sync-package WPs must
   also state "safety-canary tests pass" explicitly in Evidence. Then
   `bun run verify` and read the skip list.
6. Fill Evidence on the WP and the tracking row. Set status to
   `verifying`, re-run the checks on the final tree, then `done` or
   `escalated`. Commit with a conventional message scoped to the change
   (`feat(core): …`, `feat(sync): …`, `feat(backend): …`, `feat(web): …`)
   and push. Open a PR against `main` and mark it ready once verify
   passes.
7. If you cannot finish, write the typed handoff in the WP file, set the
   row to `waiting` or `escalated`, push, and stop. Do not silently mark
   `done`.
8. On `escalated`: post one PR comment with the escalation packet
   (decision required, recommended option, alternatives tried, cost of
   waiting, safest default) and stop.
9. When every WP is `done` and the finish line below holds: WP-09 posts
   the closing comment and this directory becomes eligible for deletion.

## Order

| WP | File | Depends on | Lane |
| --- | --- | --- | --- |
| 01 | [WP-01-booking-contracts.md](WP-01-booking-contracts.md) | — | contracts |
| 02 | [WP-02-occupancy-honesty.md](WP-02-occupancy-honesty.md) | — | A (sync), parallel with 01 |
| 03 | [WP-03-persistence-and-slug.md](WP-03-persistence-and-slug.md) | 01 | B (backend) |
| 04 | [WP-04-slot-engine.md](WP-04-slot-engine.md) | 01 | C (pure), parallel with 02/03 |
| 05 | [WP-05-calendar-application-interface.md](WP-05-calendar-application-interface.md) | 01, 02 | A+B |
| 06 | [WP-06-public-booking-api.md](WP-06-public-booking-api.md) | 03, 04, 05 | B |
| 07 | [WP-07-host-settings-ui.md](WP-07-host-settings-ui.md) | 03 | D (web admin) |
| 08 | [WP-08-public-booking-page.md](WP-08-public-booking-page.md) | 06 | D (web public) |
| 09 | [WP-09-e2e-docs-closeout.md](WP-09-e2e-docs-closeout.md) | 07, 08 | — |

Lanes touch disjoint packages, so WPs in different lanes may run in
parallel **only** when different owners hold them; a solo manager session
works strictly in table order, skipping WPs whose dependencies are not
`done`. Everything is sequential unless `TRACKING.md` says otherwise.

## Pack finish line

A Google-connected Compass user can enable a booking page in Settings,
copy `https://compasscalendar.com/book/<slug>`, and a guest (no Compass
account) can pick a 15-minute-aligned slot, enter name and email, and
confirm. Confirm creates a timed Google event on the destination calendar
with the guest invited, a Meet link, and `guestsCanInviteOthers` from
the page setting. Busy (opaque) events and buffers block slots; free /
transparent events do not. Stale or unhealthy sync fails closed (no
slot, confirm `409`). The guest can cancel via the tokenized link. The
public page does not load the keyboard-first calendar shell. All
package suites, `type-check`, `lint`, `knip`, and the booking e2e/a11y
specs are green.

## Dark launch

There is no feature-flag system. The launch mechanism is layering:
contracts (WP-01), occupancy (WP-02), persistence (WP-03), and the slot
engine (WP-04) are inert until a public API (WP-06) and UI (WP-07/08)
start sending data. Every WP must land independently green and
shippable. A page that is not enabled (`enabled: false`) `404`s on the
public URL.

## Out of scope for the whole pack

- Multiple appointment types, custom questions, paid booking, teams
- Guest reschedule
- Compass-sent email of any kind
- `guestsCanModify`
- RSVP-strict occupancy
- Editable slug
- Standalone booking brand/domain/deployable
- Meeting-link editing in the calendar event form (Meet is created only
  on the booking confirm path)

## Capability budget (standing)

| Action | Default |
| --- | --- |
| Read, draft, tests, commits, ledger writes, PRs to `main` | Allow |
| New booking routes, Settings page, public `/book/` route | Allow (pre-approved 2026-08-30) |
| Required Google OAuth scope list changes | Human |
| Production deploy, secrets, OAuth grants, deletion, access grants | Human |
| Standalone booking product launch | Human |

## Deletion criteria

Delete `wip/booking/` when all of the following are true:

1. WP-01 through WP-09 are `done` with evidence another agent can replay.
2. Durable documentation lives in `docs/features/booking.md` and the
   feature-file map / glossary (WP-09) — nothing in this directory is
   still the source of truth for how to implement.
3. A final commit removes the directory and mentions the replacement
   paths. Update the AGENTS.md Lookups line in that same commit.
