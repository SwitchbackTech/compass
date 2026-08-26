# Attendee support — work pack

Temporary project pack. Manager sessions execute the work packages (WPs)
in dependency order on the integration branch
`claude/attendee-support-planning-nljgeg`, then **delete this entire
directory** when the pack finish line holds and the PR is merged.

Do not re-litigate the design. The architecture decisions live in
[`00-context-and-invariants.md`](00-context-and-invariants.md) and were
approved by the product owner on 2026-08-25. If a WP's steps contradict
the code you find, prefer the code, note the delta in the WP's Evidence
section, and keep the WP's finish line intact.

## How to pick up (manager-loop protocol)

1. Check out `claude/attendee-support-planning-nljgeg` from origin. If it
   no longer exists (pack merged to `main`), recreate it from
   `origin/main`.
2. Read this file and [`TRACKING.md`](TRACKING.md). Do not start from chat
   memory.
3. Concurrency guard: if any row is `running` with a `started_at`
   timestamp younger than 3 hours, stop — another session is working.
   Exit as a no-op. If the `running` row is older than 3 hours, treat it
   as abandoned: fill that WP's Handoff block from what you can observe,
   then take the WP over.
4. Take the first WP whose status is `queued` and whose dependencies are
   `done`. Set that row to `running` with yourself as `owner` and a UTC
   `started_at` timestamp in the evidence column. Commit and push the
   ledger update before implementing, so overlapping sessions see it.
5. Implement only that WP. The finish line, steps, acceptance tests, and
   a paste-ready session prompt are in the WP file.
6. Validate before pushing: the changed package's test suite,
   `bun run type-check`, `bun lint`, `bun knip`. Sync-package WPs must
   also state "safety-canary tests pass" explicitly in Evidence.
7. Fill Evidence on the WP and the tracking row. Set status to
   `verifying`, re-run the checks on the final tree, then `done` or
   `escalated`. Commit with a conventional message scoped to the change
   (`feat(core): …`, `feat(sync): …`, `feat(web): …`) and push.
8. Update the PR description checklist (one checkbox per WP).
9. If you cannot finish, write the typed handoff in the WP file, set the
   row to `waiting` or `escalated`, push, and stop. Do not silently mark
   `done`.
10. On `escalated`: post one PR comment with the escalation packet
    (decision required, recommended option, alternatives tried, cost of
    waiting, safest default) and disable the manager Routine so it stops
    burning sessions until a human re-enables it.
11. When every WP is `done` and the finish line below holds: post one
    closing PR comment requesting review, then disable the Routine.

## Order

| WP | File | Depends on | Lane |
| --- | --- | --- | --- |
| 01 | [WP-01-core-write-contracts.md](WP-01-core-write-contracts.md) | — | — |
| 02 | [WP-02-sync-attendee-writes.md](WP-02-sync-attendee-writes.md) | 01 | A (sync) |
| 03 | [WP-03-backend-write-path.md](WP-03-backend-write-path.md) | 01 | B (backend), may run parallel with 02 |
| 04 | [WP-04-web-attendee-editor.md](WP-04-web-attendee-editor.md) | 02, 03 | B — launch gate for editing |
| 05 | [WP-05-contacts-scope-and-suggestions.md](WP-05-contacts-scope-and-suggestions.md) | — | C, parallel with 01–04 |
| 06 | [WP-06-contacts-surface.md](WP-06-contacts-surface.md) | 04, 05 | C |
| 07 | [WP-07-rsvp-sync.md](WP-07-rsvp-sync.md) | 01, 02 | A |
| 08 | [WP-08-rsvp-surface.md](WP-08-rsvp-surface.md) | 03, 07 | B |
| 09 | [WP-09-e2e-docs-closeout.md](WP-09-e2e-docs-closeout.md) | 04, 06, 08 | — |

Lanes touch disjoint packages, so WPs in different lanes may run in
parallel **only** when different owners hold them; a solo manager session
works strictly in table order, skipping WPs whose dependencies are not
`done`. Everything is sequential unless `TRACKING.md` says otherwise.

## Pack finish line

A Compass user on a writable Google calendar can add and remove attendees
from the event form (with Google-contact suggestions once they grant the
optional contacts scope), choose at save time whether Google emails
invitations, see other attendees' RSVP changes arrive live, and RSVP
(accepted / declined / tentative) to events they are invited to — per
occurrence or for the whole series. All package suites, `type-check`,
`lint`, `knip`, and the e2e suite are green, and no attendee or contact
content appears in sync logs, SSE payloads, or error causes
(safety-canary suite green).

## Dark launch

There is no feature-flag system. The launch mechanism is layering:
contracts (WP-01) and provider plumbing (WP-02/03/05/07) are inert until
a UI WP (04, 06, 08) starts sending data. Every WP must land
independently green and shippable.

## Out of scope for the whole pack

- Compass-sent email of any kind (Google sends invitation emails via
  `sendUpdates`)
- `guestsCanModify` (non-organizer guest-list editing) — documented
  follow-up
- Conference/Meet creation or editing
- Attendee support for non-Google (local/anonymous) calendars beyond a
  typed rejection
- Etag/If-Match conditional-retry loops (fetch→patch race is a named
  wart, see WP-09 docs)
- Free/busy attendee availability lookup

## Capability budget (standing)

| Action | Default |
| --- | --- |
| Read, draft, tests, commits to the integration branch, ledger writes | Allow |
| New sync/backend routes, optional-scope consent additions per WP-05 | Allow (pre-approved 2026-08-25) |
| Touching `GOOGLE_AUTH_SCOPES_REQUIRED` or any required scope list | Human |
| Squash-merge to `main`, production deploy, secret changes | Human |

The contacts scopes (`contacts.readonly`, `contacts.other.readonly`) are
Google *sensitive* scopes: adding them to the consent screen was approved
by the product owner, but production OAuth re-verification with Google is
a human-side external action and never blocks a WP.

## Deletion criteria

Delete `wip/attendee-support/` when all of the following are true:

1. WP-01 through WP-09 are `done` with evidence another agent can replay.
2. The integration PR is merged.
3. Durable documentation lives in `docs/features/attendees.md` (WP-09) —
   nothing in this directory is still the source of truth.
4. A final commit removes the directory and mentions the replacement
   paths.
