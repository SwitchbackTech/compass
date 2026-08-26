# WP-06 — Contacts surface: proxy, suggestions, enable nudge

**task_id:** WP-06
**status:** done
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

Recorded 2026-08-26 (implementer: manager-loop session):

```text
commands run: bun test:backend (via the scratchpad IPv4 listen shim preloaded
  into the runner AND bunfig [test] preload — TEMPORARY, reverted before
  commit, bunfig.toml byte-identical to HEAD; same environment workaround as
  WP-02/03/05); bun test:web; bun test:core; bunx playwright test e2e/oauth
  --timeout=180000 (chromium installed via bunx playwright install chromium);
  bun run type-check; bun lint (after bun lint:fix); bun knip. All re-run on
  the final tree (verifying pass).
test:backend / test:web result: test:backend 406 pass 1 skip 8 fail — the
  IDENTICAL pre-existing baseline set documented in WP-03 (GET /api/config x3,
  UserController x5; sandbox-environment issues), +16 net new passing tests
  (contacts.controller.test.ts 8, sync-service.client contacts trio,
  connection-state canSuggestContacts, core begin-request features trio, ...).
  test:web 2388 pass 0 fail (316 files; was 2364 — +24: contact-nudge.gate 4,
  useContactSuggestions 7 + rankContactSuggestions 2,
  EnableContactSuggestionsNudge 3, AttendeeField menuFooter 1,
  EventForm.contact-suggestions 3, useConnectGoogle features 2,
  refreshUserMetadataAfterGoogleConnect 2). test:core 618 pass 0 fail.
e2e oauth spec result: bunx playwright test e2e/oauth --timeout=180000 — the
  2 NEW WP-06 tests pass (contacts granted: sign-in completes and the store
  carries canSuggestContacts true; contacts denied: sign-in completes, no
  missing-scopes error, connection HEALTHY, capability false — no
  insufficientScopes regression). The PRE-EXISTING "finishes a saved Google
  sign-in callback" test fails in THIS container on its transient
  role=status spinner visibility assertion — the base tree with the work
  stashed fails the IDENTICAL assertion the same way (environment timing,
  not WP-06). Recording loudly per instructions: 2 passed, 1 pre-existing
  environment failure identical on base.
required-scopes-unchanged proof: git diff shows NO change to web
  GOOGLE_AUTH_SCOPES_REQUIRED, backend GOOGLE_AUTH_SCOPES, sync GOOGLE_SCOPES,
  or e2e REQUIRED_SCOPES (the e2e spec's REQUIRED_SCOPES const is untouched
  verbatim; the new OPTIONAL_CONTACTS_SCOPES const is additive with a warning
  comment). WP-05's literal-pin tests (google-authorization.test.ts,
  google.auth.scopes.test.ts, google.scopes.test.ts) all still pass in the
  suites above; the web "completes sign-in when the optional contacts scopes
  are not granted" test is unchanged and green.
type-check / lint / knip result: all exit 0. lint: 0 errors, 10 pre-existing
  warnings (untouched files; semantic-color check green). knip: no findings
  (pre-existing .css configuration hint only).
suggestion-content-never-logged proof: backend — the controller's ONLY log
  emission goes through exported contactSuggestionsFailureLogLine(error),
  whose input type (SyncClientError: kind/status/correlationId) physically
  cannot carry the query or a suggestion; the rendered line is literal-pinned
  in contacts.controller.test.ts. SyncServiceClient never logs. web — no
  console/log call exists in ContactsApi, useContactSuggestions, or the
  AttendeeField path; failures resolve to [] silently (tested: proxy 503 →
  empty, no toast).
nudge frequency rule encoded in tests: contact-nudge.gate.test.ts IS the
  frequency rule (at most once per session; dismissal persisted in
  localStorage forever; storage-throw still bounded), plus component-level
  pins in EnableContactSuggestionsNudge.test.tsx (second mount in a session
  renders nothing; dismissal survives a new session; never a modal).
deltas from spec (if any):
  - Backend "billing middleware parity with event reads": event READS are
    verifySession() only — billing (assertBillingAllowsWrites) guards writes,
    not reads — so the proxy route is verifySession() only, documented in
    contacts.routes.config.ts. Exact parity, no billing gate to copy.
  - Every sync-side failure (not just "sync down") degrades to the typed
    empty 200 {suggestions: []}: unavailable/timeout/conflict AND the 403
    contacts_not_granted race (metadata staler than a revocation) — one
    keystroke can never toast. Only a malformed browser query is a 400.
  - ConnectionBeginRequestSchema (core) gained optional `features`
    (ConnectionBeginFeaturesSchema); a legacy body parses byte-identically
    (tested). The backend begin controller and sync route needed NO changes —
    the schema flows web → backend parse → sync body, and sync's route
    already read `features` (WP-05).
  - useConnectGoogle options gained `features`; it rides both fresh-connect
    and reconnect begin bodies; absent, the body is byte-identical (tested).
  - canSuggestContacts is REQUIRED on GoogleSyncConnectionSummary (backend
    always sets it from the suggestContacts capability); the web selector
    reads `=== true` so an older backend payload (field absent) degrades to
    "not granted" rather than crashing. Test fixtures updated accordingly.
  - AttendeeField gained `menuFooter` (rendered via a module-scope custom
    react-select Menu reading a context, so component identity stays stable)
    and `filterOption={null}`: the suggestion source already matches AND
    ranks, and react-select's default substring filter was hiding legitimate
    People matches that hinge on fields the label never shows (regression
    surfaced by the ranked-suggestions test).
  - useContactSuggestions debounces inside the suggestionSource callback
    (250ms, superseding pending calls), enforces the 2-char minimum, runs
    fetches through queryClient.fetchQuery (TanStack cache + dedupe,
    staleTime 30s), and aborts in-flight requests on unmount via a new
    optional `signal` on the web ApiRequestConfig/BaseApi fetch (additive).
  - "Metadata refetch on completion": the connect flow is a full-page OAuth
    round-trip, so the return IS a fresh load; additionally
    refreshUserMetadataAfterGoogleConnect("connected") force-refreshes
    metadata at bootstrap (chains onto any in-flight fetch), so the
    capability is live in that page load with no manual reload. (tested)
  - EnableContactSuggestionsNudge.test.tsx uses the repo's delegating
    mock.module pattern for useConnectGoogle: the single-process web suite
    already carries earlier files' process-wide stubs of that module (one
    without `connect` at all), so the real hook is unreachable there. The
    nudge is asserted at the hook boundary (features:["contacts"] passed,
    click invokes connect); the features → begin-body wire threading is
    asserted in useConnectGoogle.scope.test.tsx, which runs before any
    module mock exists. My mock delegates to the real hook after the file
    (afterAll), unlike the pre-existing permanent stub.
  - e2e grant/deny paths ride the SIGN-IN callback spec (the flow the spec
    harness models): granted = REQUIRED + both contacts scopes on the
    callback; denied = REQUIRED only; both complete sign-in, and the
    userMetadata e2e store bridge is asserted for connectionState HEALTHY +
    canSuggestContacts true/false.
  - Environment notes: bun 1.3.11 vs pinned 1.3.14 (harness warns); IPv4
    listen shim as above (scratchpad-only, never committed); Playwright
    chromium installed in-container.
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
