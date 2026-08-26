# WP-09 — E2E, docs, polish, pack closeout

**task_id:** WP-09
**status:** done
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

Recorded 2026-08-26 (implementer: manager-loop session — 2ND TAKEOVER: the
first takeover's e2e/attendees/ tree (`attendee-harness.ts`,
`attendee-editor.spec.ts`, `contact-suggestions.spec.ts`, `rsvp.spec.ts`,
`rsvp-control.spec.ts`, `debug.spec.ts`) was reviewed critically by running
it, not trusted. Findings and fixes below):

```text
commands run: bunx playwright test e2e/attendees e2e/oauth e2e/accessibility
  --timeout=180000 (chromium via bunx playwright install chromium); bun
  test:core; bun test:web; bun test:sync / bun test:backend (via
  --preload <scratchpad>/ipv4-listen-shim.ts + test-mongo-env.ts — TEMPORARY,
  never committed, same IPv6-listen environment workaround as WP-02/03/05/
  06/07/08, this session's own copy); bun run type-check; bun lint (bun
  lint:fix for formatting only, 3 files); bun knip.

inherited-tree audit (kept / fixed / discarded):
  - attendee-harness.ts: KEPT the fixture/route-stub shape, FIXED two real
    bugs found by actually running the suite (both silent failures — no
    thrown error, no request, no chip/answer):
    1. `__COMPASS_E2E_TEST__` makes SessionProvider skip the real session
       check, so `useSession().authenticated` starts and stays false. The
       inherited harness only set the REMEMBERED-auth localStorage flag
       (which steers event.repository.source.store's local-vs-remote
       choice) — it never called
       `window.__COMPASS_E2E_HOOKS__.setAuthenticated(true)`, which
       useCalendarsQuery's `calendarsQueryOptions(authenticated)` gates on
       separately. Every fixture event was therefore fetched against the
       synthesized ANONYMOUS local-calendar id and never appeared on the
       grid (openEventForm timeouts on every spec). Fix mirrors the
       already-shipped e2e/calendars/calendar-experience.spec.ts pattern.
    2. GET /api/user/metadata was stubbed to always answer
       `{connectionState:"HEALTHY"}` with no connections, ignoring
       `options.canSuggestContacts` — the initial e2e-store-bridge
       injection got clobbered back to false by the next real metadata
       refetch (refreshUserMetadata() re-fires on its own), so
       AttendeeField never got a real suggestionSource and
       captured.suggestionQueries stayed empty. Fixed by making the route
       stub itself answer with the capability on every fetch.
    3. Added `dispatchClick` (DOM `element.click()`, same technique as the
       existing `clickSave` in e2e/utils/event-test-utils.ts) and used it
       for every button/radio inside OverlayPanel-based floating UI (Send/
       Don't send, RecurrenceScopeDialog "Ok"/"Cancel", the RSVP
       Going/Maybe/Decline radios, the scope-dialog radios, the picked
       suggestion option): Playwright's built-in `.click()` on these
       silently lands on nothing between its actionability check and the
       floating panel's re-render — no thrown error, no network call, no
       state change — confirmed by isolating each click with an evaluate-
       click vs. a keyboard-Enter control.
  - attendee-editor.spec.ts, contact-suggestions.spec.ts: KEPT (payload
    assertions and scenarios were sound), updated only for the two harness
    fixes above.
  - rsvp.spec.ts: KEPT (payload assertions and scenarios were sound; same
    fixes applied).
  - rsvp-control.spec.ts: DISCARDED — imported helpers
    (buildTimedEvent/setupAttendeePage/objectId/composeOccurrenceId/
    OTHER_ORGANIZER_EMAIL) that do not exist in the current
    attendee-harness.ts (a stale draft from an earlier, incompatible
    harness API — TypeError at runtime, never ran). Its three scenarios
    (single/occurrence/series-base RSVP) fully duplicate rsvp.spec.ts
    against the current harness, so nothing was lost.
  - debug.spec.ts: DELETED per instructions (scratch investigation using
    page.waitForTimeout — forbidden sleeps, not a real spec). Its output
    (captured API traffic + a mismatched calendarId) is what led directly
    to harness fix #1 above.
  No scope was trimmed dishonestly: all three finish-line flows (guest add
  + Send/Don't-send payload, suggestion picker incl. min-length/debounce,
  RSVP incl. per-occurrence scope dialog) run against genuine mounted
  AttendeeField/RsvpControl components under simulated real auth — not
  faked, not skipped.

e2e/attendees result: 8 pass, 0 fail (4 files) — 3 runs in a row confirmed
  no flake after the fixes above. attendee-editor.spec.ts (4): guest add +
  Send prompt asserts the exact wire body (attendees replace-shape, no
  responseStatus, invitation "all"); Don't send -> invitation "none";
  untouched save carries neither an attendees nor invitation key; invalid
  email never becomes a chip (acceptance test "Incomplete input").
  contact-suggestions.spec.ts (1): 1-char query fires nothing across the
  250ms debounce window, 2-char query fires exactly one suggestions
  request, picking a suggestion adds a named chip. rsvp.spec.ts (3): single
  event answers immediately with no dialog; an occurrence offers This
  Event/All Events (exactly 2 radios, never "following") and posts the
  composite eventId::recurrenceId; a series-base occurrence answers "all"
  and Cancel sends nothing.
e2e/oauth --timeout=180000 result: 2 pass, 1 pre-existing fail — the SAME
  "finishes a saved Google sign-in callback" role=status strict-mode/
  spinner-timing failure WP-06/WP-08 already documented as environment-
  timing, identical on this container regardless of this WP's changes (file
  untouched by this WP's diff).
e2e/accessibility --timeout=180000 result: 7 pass, 0 fail — unchanged from
  WP-04/06/08 (RsvpControl/AttendeeField still do not mount under this
  harness's anonymous local-mode app; their accessibility contracts stay
  pinned via RTL semantics in RsvpControl.test.tsx/AttendeeField.test.tsx,
  as WP-08 already documented). e2e/attendees/ is what actually axe-sweeps
  neither component — it drives them under a real signed-in DOM instead,
  which is a different, complementary kind of coverage, not a a11y sweep.
tool-failure check: chromium was not preinstalled in this container;
  `bunx playwright install chromium` was run and printed progress (no
  silent skip) before any spec ran.
test:core result: 618 pass, 0 fail (37 files) — unchanged (WP-09 makes no
  core contract changes).
test:web result: 2407 pass, 0 fail (319 files) — unchanged from WP-08 (no
  web source changes, only e2e/docs).
test:sync result: 1072 pass, 0 fail (81 files) — unchanged from WP-07;
  safety-canary suite re-run standalone: 19 pass, 0 fail.
test:backend result: 415 pass, 1 skip, 8 fail (52 files) — the IDENTICAL
  pre-existing baseline (GET /api/config x3, UserController x5) documented
  since WP-03/06/08 (container env; re-confirmed via
  `--preload ipv4-listen-shim.ts` + test-mongo-env.ts, the same temporary,
  never-committed IPv6-listen workaround used by every prior sync/backend
  WP in this pack — this sandbox cannot bind net.Server to "::").
type-check / lint / knip result: all exit 0. lint: 0 errors, 10
  pre-existing warnings (untouched files, identical set every prior WP
  documented). knip: no findings (pre-existing .css configuration hint
  only).
docs paths written:
  - docs/features/attendees.md (new): flow diagram (web -> backend ->
    /internal/commands -> Google + contacts side-channel), invitation-
    intent semantics, merge-by-email + replay rules, contacts consent flow,
    RSVP semantics (self-entry rewrite, per-occurrence vs. series), the
    three named warts, and an explicit note on the e2e coverage boundary.
    Every claim in it cites the specific passing test(s) that back it.
  - README.md: "Things you can't do in Compass (yet)" no longer lists
    attendees (moved to the can-do list: "Add/remove event attendees and
    RSVP to invites, with optional Google-contact suggestions"); reminders
    and meeting links stay listed as not-yet, honestly (no reminders work
    shipped in this pack).
  - docs/README.md: added an "Attendees, contact suggestions, or RSVP"
    Common Change Paths row pointing at the new doc + feature-file-map
    anchor.
  - docs/development/feature-file-map.md: added an "Attendees, Contacts,
    And RSVP" section (key files across core/web/backend/sync + e2e/) that
    points at docs/features/attendees.md.
ledger audit result: WP-01 through WP-08 all `done` in TRACKING.md, each
  with a non-empty, replayable Evidence section in both TRACKING.md and its
  own WP file (spot-read all eight WP files' Evidence sections directly,
  not just the TRACKING.md summary cells). No row was `waiting` or
  `escalated`. This WP-09 row flips to `done` last, after this Evidence
  section and the final verification re-run below.
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
from: manager-loop (2nd takeover session)
to: human review of the integration PR
status: done
artifact:
  - e2e/attendees/attendee-harness.ts
  - e2e/attendees/attendee-editor.spec.ts
  - e2e/attendees/contact-suggestions.spec.ts
  - e2e/attendees/rsvp.spec.ts
  - docs/features/attendees.md
evidence: see Evidence section above and TRACKING.md WP-09 row
assumptions:
  - The e2e/attendees suite simulates signed-in Google state on the same
    anonymous-local-mode Playwright web server every other e2e suite uses
    (no real backend); this is the same sanctioned pattern as e2e/oauth and
    e2e/calendars/calendar-experience.spec.ts, not a new mechanism.
  - The scratchpad IPv4-listen shim used for test:sync/test:backend in this
    session is local-only and was never committed, matching every prior
    sync/backend WP's environment note.
open_risks:
  - The 8 pre-existing backend failures (GET /api/config x3, UserController
    x5) and the 1 pre-existing oauth spinner-timing failure are
    container-environment issues unrelated to any code in this pack,
    documented identically since WP-01/WP-03/WP-06.
next_deadline: none — pack complete pending human PR review
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
