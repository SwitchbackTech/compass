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

```text
commands run:
test:sync / test:core result:
safety-canary suite (incl. new pattern): pass/fail
required-scope-lists-unchanged proof:
type-check / lint / knip result:
deltas from spec (if any):
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
