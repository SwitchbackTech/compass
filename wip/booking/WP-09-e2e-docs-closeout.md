# WP-09 — E2E, docs, pack closeout

**task_id:** WP-09
**status:** queued
**owner:** Implementer (e2e + docs), then Verifier
**depends on:** WP-07, WP-08
**next owner after done:** human for production deploy / standalone product

## Why

Prove the guest and host journeys, fold implementation facts into durable
docs, and make `wip/booking/` deletable.

Key files:

- New `e2e/booking/` Playwright specs (follow `e2e/attendees/` and
  `e2e/timed/` patterns; API stubbing via `page.route("**/api/**")`)
- [`docs/features/booking.md`](../../docs/features/booking.md) — add
  implementation file pointers and named warts discovered in WPs
- [`docs/README.md`](../../docs/README.md)
- [`docs/development/feature-file-map.md`](../../docs/development/feature-file-map.md)
- [`docs/architecture/glossary.md`](../../docs/architecture/glossary.md)
- [`README.md`](../../README.md) — "can't do yet" / features list
- [`AGENTS.md`](../../AGENTS.md) — Lookups: keep the pack line until
  deletion; WP-09 may add a booking docs pointer now

## Finish line

1. `e2e/booking/` covers: public page loads without login; slot +
   confirm against stubbed APIs (payload asserted); 409 refresh;
   Settings booking page (authenticated e2e harness) shows copyable
   link. Suite green (`bun test:e2e` filtered to booking) or documented
   Chromium skip.
2. `bun test:a11y` includes the public booking page (or a dedicated
   spec). Incomplete axe results are logs, not failures (testing
   playbook).
3. Durable docs updated: feature-file map, glossary terms (Booking
   page, Booking slug, Reservation, Host, Guest), README features
   line for booking. `docs/features/booking.md` gains an
   "Implementation map" section citing real files.
4. TRACKING.md shows WP-01..08 `done` with evidence; this WP flips
   `done` last.
5. type-check, lint, knip, and the package suites required by the diff
   are green.

## Steps

1. Write e2e specs with stubbed `/api/booking/**`. No real Google.
2. Update docs from what the code actually does (prefer code if a WP
   drifted; record deltas).
3. Full verification sweep for the diff.
4. Fill Evidence; audit every WP Evidence section is non-empty.

## Acceptance tests

- **Normal:** guest confirm e2e passes headless chromium.
- **Incomplete input:** e2e asserts missing email does not POST.
- **Tool failure:** missing Playwright Chromium → print install
  command, do not claim e2e passed.
- **Policy:** README does not claim reschedule, multiple event types,
  or a standalone booking product.

## Evidence

Fill when implementing.

## Out of scope

- Deleting `wip/booking/` (post-merge, once docs are the source of
  truth)
- Production DNS / billing packaging

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
wip/booking/WP-09-e2e-docs-closeout.md in the Compass repo. Read
wip/booking/README.md and TRACKING.md first. Mark WP-09 running,
commit the ledger, implement only this WP.

Finish line: e2e/booking green (or honest Chromium skip), a11y on the
public page, docs/README/feature-file-map/glossary/root README updated,
booking.md implementation map, ledger WP-01..08 already done. Fill
Evidence, push, PR to main.
```
