# WP-05 — Contacts scopes, People adapter, sync suggestions endpoint

**task_id:** WP-05
**status:** queued
**owner:** Implementer (sync)
**depends on:** none (lane C — may run parallel with WP-01–04)
**next owner after done:** WP-06 unblocks (with WP-04)

## Why

Attendee suggestions need Google contacts, which Compass has never
touched. Sync owns all Google code, incremental auth, and per-connection
granted scopes — so the People adapter, the optional-scope consent, the
`suggestContacts` capability, and the internal suggestions route all
land here. The contacts scopes are **optional**: sign-in and calendar
connect keep working for users who never grant them.

Approval note: adding `contacts.readonly` and `contacts.other.readonly`
as optional consent-screen scopes was approved by the product owner on
2026-08-25 (see TRACKING approval column). The required scope lists
(`GOOGLE_AUTH_SCOPES_REQUIRED` in web, backend required validation)
must NOT change — that would brick sign-in and is Human-gated.

Key files:

- [`packages/sync/src/providers/google/google.scopes.ts`](../../packages/sync/src/providers/google/google.scopes.ts)
- [`packages/sync/src/providers/google/google-auth.adapter.ts`](../../packages/sync/src/providers/google/google-auth.adapter.ts)
  (`buildAuthorizationUrl`, already `include_granted_scopes: true`)
- [`packages/sync/src/server/connection.routes.ts`](../../packages/sync/src/server/connection.routes.ts)
  (`BEGIN_PATH`; callback already persists granted scopes)
- [`packages/sync/src/providers/google/google-capabilities.ts`](../../packages/sync/src/providers/google/google-capabilities.ts)
- [`packages/core/src/types/sync/identity.contracts.ts`](../../packages/core/src/types/sync/identity.contracts.ts)
  (capability enum, contract test)
- New: `packages/sync/src/providers/google/google-people.adapter.ts`,
  `packages/sync/src/server/contacts.routes.ts` (or colocated in an
  existing routes file per repo taste),
  `packages/core/src/types/contact.contracts.ts`

## Finish line

1. Named scope consts exist for both contacts scopes; the base
   `GOOGLE_SCOPES` array is unchanged (regression test).
2. Connection begin accepts optional `features: ["contacts"]`; with it,
   the consent URL contains both contacts scopes plus the calendar
   scopes; without it, the URL is byte-identical to today.
3. A callback persisting a contacts grant yields a connection whose
   capabilities include `suggestContacts` (either contacts scope
   suffices — partial grants are normal).
4. `GET/POST /internal/contacts/suggestions` (principal-scoped,
   rate-limited) returns ranked `{email, displayName}[]` from the People
   API via a narrow `ContactsPort`; refuses (typed, non-500) when the
   capability is absent; queries under 2 chars return empty without a
   Google call. Response shape lives in `contact.contracts.ts` —
   email + displayName only, nothing else from People.
5. Contact data never appears in logs or error causes — extend the
   safety-canary patterns with a People-shaped pattern (e.g.
   `"emailAddresses"`), and the suite passes.
6. Onboarding consent: the sign-in flow's *requested* scope list gains
   the contacts scopes as optional (users can leave them unchecked and
   proceed) — the backend adoption path stores what was granted. The
   *required* verification lists stay untouched, with an explicit test
   asserting sign-in succeeds when contacts are not granted.
7. `bun test:sync`, `test:core`, `type-check`, `lint`, `knip` green.

## Steps

1. Read the key files, their tests, and
   `e2e/oauth/google-auth-callback.spec.ts` (do not change its required
   list; WP-06 extends e2e).
2. Scope consts + `CONTACTS_FEATURE_SCOPES` array; extend
   `buildAuthorizationUrl` input with optional extra scopes; extend the
   BEGIN_PATH request schema with `features`.
3. Capability: `googleCapabilitiesFromScopes` emits `suggestContacts`;
   add the enum member + contract test in `identity.contracts.ts`.
4. `ContactsPort` + `google-people.adapter.ts` with an injectable
   client factory (mirror `GoogleOAuthClientFactory`); implement search
   over `people.searchContacts` and `otherContacts.search`, querying
   only APIs the granted scope allows; merge + rank results.
5. Suggestions route: resolve connection by principal, check
   capability, call the port, map to the contract. Rate-limit like
   existing internal routes.
6. Sign-in requested-scope addition: locate where the sign-in flow's
   requested scopes are assembled (backend SuperTokens clients config +
   web `useStartGoogleAuthorization`) and add contacts as
   requested-but-not-required. Server-side validation
   (`grantedGoogleScopes`) must keep passing without them.
7. Fakes: `FakePeopleApi` class implementing the port; route
   `.db.test.ts`; canary extension tests.
8. Run the finish-line checks.

## Acceptance tests

- **Normal:** begin with `features: ["contacts"]` → consent URL has both
  contacts scopes; query "al" → ranked suggestions from the fake.
- **Incomplete input:** query under 2 chars → empty 200, no Google
  call; connection with only `contacts.other.readonly` → capability
  present, only otherContacts queried.
- **Tool failure:** People API 429 → typed retryable error, no crash,
  no contact data in the error cause.
- **Policy:** connection without a contacts grant → capability absent,
  route refuses; base connect URL and required sign-in scopes
  byte-identical to today; sign-in succeeds with contacts unchecked.

## Evidence

Recorded 2026-08-26 (implementer: manager-loop session):

```text
commands run: bun test:sync (full, in-memory Mongo harness); bun test:core;
  bun run type-check; bun lint (after bun lint:fix for formatting of new
  files); bun knip; regression for the sign-in scope split: bun
  test:backend:fast, bun test:web. All re-run on the final tree.
test:sync / test:core result: test:sync 1052 pass 0 fail (81 files; was 1017/78
  — +35 tests, +3 files: google.scopes.test.ts, google-people.adapter.test.ts,
  contacts.routes.db.test.ts, plus extended auth-adapter/capabilities/
  connection-routes/canary suites). test:core 615 pass 0 fail (37 files;
  +contact.contracts.test.ts, extended identity/connection contract tests).
safety-canary tests pass: yes — patterns extended with two People shapes
  ("emailAddresses":, "suggestions":[{) in EVENT_CONTENT_PATTERNS; safety
  suite re-run standalone under the harness: 19 pass 0 fail. The people
  adapter test additionally proves a failed search's error/cause chain
  carries no contact data or token (findSafetyCanaryHit null + literal
  absence asserts); route log lines are static text with redactedCause only.
required-scope-lists-unchanged proof:
  - web GOOGLE_AUTH_SCOPES_REQUIRED: untouched (git diff shows only comments
    + new OPTIONAL/REQUESTED consts around it); pinned by the new literal
    test "keeps the required scope list free of the optional contacts
    scopes" in google-authorization.test.ts. Verification in
    complete-google-authorization.ts still checks REQUIRED only (unchanged).
  - backend GOOGLE_AUTH_SCOPES (the required-validation list used by
    grantedGoogleScopes): untouched; pinned by the new literal test in
    google.auth.scopes.test.ts ("no contacts scope, ever"). Only the
    SuperTokens client config now uses GOOGLE_AUTH_SCOPES_REQUESTED.
  - sync base GOOGLE_SCOPES: untouched; pinned literally by
    google.scopes.test.ts, and the auth-adapter test proves a begin without
    features mints a byte-identical consent URL.
  - e2e/oauth/google-auth-callback.spec.ts REQUIRED_SCOPES: not modified
    (file untouched by this WP's diff).
  - explicit sign-in-without-contacts tests: backend "signs up successfully
    when the optional contacts scopes are not granted" (REQUESTED minus
    contacts === GOOGLE_AUTH_SCOPES, sign-up completes + adoption fires);
    web "completes sign-in when the optional contacts scopes are not
    granted" (callback granting REQUIRED only resolves status "completed").
type-check / lint / knip result: all exit 0. lint: 0 errors, 10 pre-existing
  warnings (untouched files). knip: no findings (pre-existing .css
  configuration hint only).
regression: test:web 2364 pass 0 fail (312 files, +2 tests);
  test:backend:fast 301 pass 20 fail — the identical pre-existing baseline
  set documented in WP-01 (SSE Server 11, supertokens.middleware.util 6,
  GET /api/config 3; sandbox-environment issues). The new backend scope
  tests pass.
deltas from spec (if any):
  - Suggestions route is GET (?q=) only, not GET/POST — one verb suffices
    for a read and matches the internal read routes; WP-06's backend proxy
    was already specified as GET.
  - The begin `features` request shape lives in core
    (ConnectionBeginFeaturesSchema in connection.contracts.ts) so WP-06's
    backend proxy reuses it; adapter input field is `extraScopes`
    (provider-neutral), populated from CONTACTS_FEATURE_SCOPES by the route.
  - Granted-scope split (which People surfaces to query) is read from the
    connection credential's stored `scopes` (only non-token field read);
    the People adapter receives it as `sources` and only queries allowed
    surfaces (searchContacts / otherContacts.search), asserted by fakes.
  - Multi-connection principals: every connection with the suggestContacts
    capability is queried and results are merged + deduped by email; a
    connection without a stored credential contributes nothing.
  - Error mapping: rateLimited → 429 {error:"rate_limited",retryable:true};
    other typed search failures and custody ProviderAuthError → 503
    {error:"contacts_unavailable",retryable:true}; capability absent → 403
    {error:"contacts_not_granted"}; passive/unconfigured → 409
    provider_work_disabled (all non-500, tested).
  - New dependency @googleapis/people@8.0.0 in packages/sync (mirrors
    @googleapis/calendar; injectable GooglePeopleApiFactory keeps tests
    network-free).
  - Environment note (same as WP-02/03): this container's kernel has IPv6
    disabled and Bun's host-less listen() binds "::", so the DB-backed
    suites ran with a TEMPORARY scratchpad-only bunfig preload shim forcing
    IPv4 binds (reverted before commit; bunfig.toml byte-identical to HEAD).
    Bun 1.3.11 vs pinned 1.3.14 (harness warns; behavior identical here).
```

## Out of scope

- Backend browser proxy and all web UI (WP-06)
- Contact caching/persistence — every query hits the People API v1
- Directory/domain-shared contacts

## Risks

- The four scope lists are a known trap: only *requested* lists change;
  a contacts scope in any *required* list bricks sign-in. The explicit
  regression test in finish line 6 is mandatory.
- People API quotas: min-length + rate limiting bound it; WP-06 adds
  client debounce.

## Handoff

```yaml
task_id: WP-05
from:
to: Implementer (sync)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-05 from
wip/attendee-support/WP-05-contacts-scope-and-suggestions.md in the
Compass repo, on branch claude/attendee-support-planning-nljgeg. Read
wip/attendee-support/README.md, TRACKING.md, and
00-context-and-invariants.md first, mark WP-05 running (owner +
started_at), push the ledger update, and do not start other WPs.

Finish line: contacts.readonly + contacts.other.readonly as OPTIONAL
scopes (begin features:["contacts"], onboarding requested list) with
required lists untouched and tested; suggestContacts capability from
granted scopes; ContactsPort + google-people.adapter with fakes;
principal-scoped /internal/contacts/suggestions returning
{email, displayName}[] only; canary extended for contact data;
test:sync + test:core + type-check + lint + knip green. Fill Evidence,
update TRACKING.md, commit conventionally, push.
```
