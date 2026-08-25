# WP-06 — Contacts surface: proxy, suggestions, enable nudge

**task_id:** WP-06
**status:** queued
**owner:** Implementer (backend + web)
**depends on:** WP-04, WP-05
**next owner after done:** WP-09 partially unblocks

## Why

WP-05 gives sync a suggestions endpoint and a capability; WP-04 gives
the form an attendee field with a pluggable suggestion source. This WP
connects them: a backend browser proxy, the capability surfaced on the
connection summary, live suggestions in the editor, and the approved
"occasional nudge" for users who haven't granted contacts.

Key files:

- Backend: new `GET /api/contacts/suggestions` route + controller;
  [`packages/backend/src/common/services/sync-service/sync-service.client.ts`](../../packages/backend/src/common/services/sync-service/sync-service.client.ts)
  (add the proxy method, mirroring existing internal calls);
  [`packages/backend/src/common/services/sync-service/connection-state.translation.ts`](../../packages/backend/src/common/services/sync-service/connection-state.translation.ts)
- Contracts: `GoogleSyncConnectionSummary` in
  [`packages/core/src/types/user.types.ts`](../../packages/core/src/types/user.types.ts)
  gains `canSuggestContacts: boolean`
- Web: suggestion source for `AttendeeField` (debounced query →
  backend, ranked with
  [`command-palette.search.ts`](../../packages/web/src/components/CommandPalette/command-palette.search.ts));
  [`useConnectGoogle.ts`](../../packages/web/src/auth/google/hooks/useConnectGoogle/useConnectGoogle.ts)
  begin call gains `features: ["contacts"]`
- E2E: [`e2e/oauth/google-auth-callback.spec.ts`](../../e2e/oauth/google-auth-callback.spec.ts)
  additions (grant and deny paths)

## Finish line

1. With the capability granted, typing ≥2 chars in the attendee field
   shows Google contact suggestions (debounced ≥250ms); selecting one
   fills the chip with displayName + email.
2. Without it, the field works as a raw email input and shows an
   occasional, dismissible "Enable contact suggestions" affordance in
   the combobox footer — never a modal, never on every open (persist a
   dismissal, e.g. localStorage, and show at most once per session).
   Clicking it starts the connect flow with `features: ["contacts"]`;
   completing consent updates the summary and suggestions work without
   a reload (metadata refetch).
3. `canSuggestContacts` flows: sync capability →
   connection-state translation → user metadata → web.
4. Sign-in flow untouched: `GOOGLE_AUTH_SCOPES_REQUIRED` unchanged,
   with an explicit test.
5. Proxy hardening: same auth/billing middleware as event reads; typed
   empty response when sync is down (no error-toast storm); suggestion
   responses never logged client- or server-side.
6. E2E oauth spec covers contacts granted and contacts denied; denied
   leaves the connection healthy with the capability false (no
   `insufficientScopes` regression).
7. `bun test:backend`, `test:web`, `test:core`, the e2e oauth spec,
   `type-check`, `lint`, `knip` green.

## Steps

1. Read the key files and WP-04's `AttendeeField` suggestion-source
   interface.
2. Backend: proxy route + client method + translation; wire
   `canSuggestContacts` through the summary.
3. Web: `useContactSuggestions` hook (TanStack Query, debounce,
   min-length, cancel-on-unmount); rank with the command-palette
   scorer; plug into `AttendeeField`.
4. Nudge affordance + `useConnectGoogle` `features` param; metadata
   refetch on connect completion (existing reconnect toast flow shows
   the pattern).
5. MSW handlers + RTL tests; backend controller tests; e2e additions.
6. Run the finish-line checks.

## Acceptance tests

- **Normal:** type 3 chars → MSW-served suggestions ranked; select →
  chip with displayName.
- **Incomplete input:** backend returns empty → "no matches" state, raw
  email entry still works.
- **Tool failure:** proxy 503 → silent fallback to raw entry, no toast
  storm.
- **Policy:** user denies contacts at Google → connection stays healthy,
  capability false, nudge still available later; required sign-in scopes
  unchanged (test).

## Evidence

```text
commands run:
test:backend / test:web result:
e2e oauth spec result:
required-scopes-unchanged proof:
type-check / lint / knip result:
deltas from spec (if any):
```

## Out of scope

- Contact caching, avatars, or any People field beyond email +
  displayName
- Nudges anywhere outside the attendee field

## Risks

- The nudge must respect the "occasional, non-nagging" product decision
  — over-showing it is a regression, encode the frequency rule in a
  test.
- Debounce + min-length are the quota guard; don't drop them when
  wiring TanStack.

## Handoff

```yaml
task_id: WP-06
from:
to: Implementer (backend + web)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-06 from
wip/attendee-support/WP-06-contacts-surface.md in the Compass repo, on
branch claude/attendee-support-planning-nljgeg. Read
wip/attendee-support/README.md, TRACKING.md, and
00-context-and-invariants.md first, mark WP-06 running (owner +
started_at), push the ledger update, and do not start other WPs. WP-04
and WP-05 must be done.

Finish line: GET /api/contacts/suggestions proxy; canSuggestContacts on
GoogleSyncConnectionSummary; debounced ranked suggestions in
AttendeeField; occasional dismissible enable-contacts nudge →
useConnectGoogle features:["contacts"] with no-reload refresh; sign-in
required scopes untouched (tested); e2e grant/deny paths; test:backend
+ test:web + type-check + lint + knip green. Fill Evidence, update
TRACKING.md, commit conventionally, push.
```
