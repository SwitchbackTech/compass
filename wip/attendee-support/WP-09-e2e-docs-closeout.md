# WP-09 — E2E, docs, polish, pack closeout

**task_id:** WP-09
**status:** queued
**owner:** Implementer (e2e + docs), then Verifier
**depends on:** WP-04, WP-06, WP-08
**next owner after done:** human review of the integration PR

## Why

The feature is shipped in layers; this WP proves it end-to-end, writes
the durable documentation that replaces this pack, and closes the
ledger so the pack can be deleted after merge.

Key files:

- New `e2e/attendees/` Playwright specs (follow `e2e/timed/`,
  `e2e/allday/`, and `e2e/oauth/` patterns; API stubbing via
  `page.route("**/api/**")`)
- New `docs/features/attendees.md` (created by this WP)
- [`README.md`](../../README.md) — "Things you can't do in Compass
  (yet)" still lists attendees; update the line honestly (reminders are
  still missing)
- [`docs/README.md`](../../docs/README.md) Common Change Paths +
  [`docs/development/feature-file-map.md`](../../docs/development/feature-file-map.md)
  — add the attendee feature area
- [`AGENTS.md`](../../AGENTS.md) — remove this pack's Lookups line when
  deleting the directory (deletion happens post-merge, not in this WP)

## Finish line

1. `e2e/attendees/` covers: add attendees + save with Send prompt
   (payload asserted via route stub), suggestion picker with a stubbed
   suggestions endpoint, RSVP control incl. per-occurrence scope
   dialog. Suite green locally (`bun test:e2e`), evidence pasted.
2. `docs/features/attendees.md` exists: flow diagram (web → backend →
   `/internal/commands` → Google), invitation-intent semantics, the
   merge-by-email and replay rules, contacts consent flow, and the
   named warts (fetch→patch race, alias-email self-match, organizer
   auto-added on create).
3. Root README's "can't do yet" line updated; docs index and
   feature-file-map reference the new page.
4. Repo-wide `bun run type-check`, `bun lint`, `bun knip` clean; the
   five package suites green.
5. TRACKING.md shows WP-01..08 `done` with evidence; this WP flips to
   `done` last; the closing PR comment (README protocol step 11) is
   posted and the Routine disabled.

## Steps

1. Read the e2e patterns and existing specs; write the attendee specs
   with stubbed `/api/**` routes (no real Google).
2. Write `docs/features/attendees.md`; update README + docs index +
   feature-file-map.
3. Full verification sweep: all package suites, type-check, lint, knip,
   `bun test:e2e`, `bun test:a11y`.
4. Fill Evidence everywhere; audit every WP's Evidence section is
   non-empty and replayable; complete the ledger.
5. Post the closing PR comment; disable the manager Routine.

## Acceptance tests

- **Normal:** the three e2e specs pass headless on chromium.
- **Incomplete input:** e2e spec asserting an invalid email cannot
  become a chip.
- **Tool failure:** missing Playwright Chromium → print the install
  command and do not claim e2e passed (never a silent skip).
- **Policy:** README claims match shipped behavior — no overclaiming
  (reminders still unsupported).

## Evidence

```text
commands run:
test:e2e result:
full-suite sweep results:
docs paths written:
ledger audit result:
```

## Out of scope

- Deleting `wip/attendee-support/` (post-merge, per README deletion
  criteria)
- Staging QA (`/qa-test-staging` runs post-deploy, human-triggered)

## Risks

- E2e flake from the scope dialog timing — use semantic locators and
  Playwright auto-waiting, no sleeps.
- Do not let doc claims drift ahead of code: verify each documented
  behavior against a passing test before writing it.

## Handoff

```yaml
task_id: WP-09
from:
to: Implementer (e2e + docs)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-09 from
wip/attendee-support/WP-09-e2e-docs-closeout.md in the Compass repo, on
branch claude/attendee-support-planning-nljgeg. Read
wip/attendee-support/README.md, TRACKING.md, and
00-context-and-invariants.md first, mark WP-09 running (owner +
started_at), push the ledger update, and do not start other WPs. WP-04,
WP-06, and WP-08 must be done.

Finish line: e2e/attendees/ specs (editor + suggestions + rsvp incl.
scope dialog) green; docs/features/attendees.md with flow, semantics,
and named warts; README + docs index updated; full repo sweep green;
ledger complete. Then post the closing PR comment requesting review and
disable the manager Routine. Fill Evidence, update TRACKING.md, commit
conventionally, push.
```
