# Multi-account sync invariants

These rules keep Compass's per-account Google sync state honest after
email/password signup plus "Add account", reconnect, and missed SSE.

Zustand remains the store for user metadata. The failure mode was refresh
discipline, not the store; migrating metadata to react-query would touch
dozens of consumers (auth, sidebar, settings, SSE handlers, and the
`__COMPASS_E2E_STORE__` Playwright bridge) to fix a problem four files own.
Calendars live in react-query and connections in zustand; refetching both
unconditionally on the same signals keeps them from diverging.

## 1. Push on every transition

`refreshConnectionState` is the only writer of derived connection state. On
change it persists the new state and appends a `kind: "connection"`
invalidation. The backend SSE bridge fans those invalidations out as
`calendarsChanged`.

Any new job kind or route that changes state-derivation evidence (bootstrap
flags, cursors, credentials, calendar-list discovery, durable read failures)
must end by calling `refreshConnectionState` with the invalidations
repository. Do not grow a second push channel. Delete the dormant
`importProgress` invalidation kind and caller-less
`sseServer.publishUserMetadata` in a follow-up cleanup rather than adding
another path.

At dispatch time the completing job is still claimed, so derivation often
lands on `catchingUp` first. That is still a change from `importing`, so the
invalidation fires, the client refetches, and the read-path refresh after the
job settles lands `healthy`.

## 2. Pull reconciliation, unconditionally cheap

Force-refresh metadata on every SSE signal, on stream open/reopen, and on
tab focus — regardless of connection state — plus a 20s poll while any
**single** connection is `connecting` / `importing` / `catchingUp`.

The sync `GET /connections` read path re-derives state, so every metadata
pull is also a server-side reconciliation. The UI self-heals even with SSE
fully dead. Concurrent `force` refreshes chain onto one trailing fetch;
an epoch counter drops stale writes.

Do not gate metadata reconciliation on HEALTHY/ATTENTION. That gate is only
for the provider Refresh enqueue.

## 3. Per-account attribution

User-visible status hangs off one connection, never the precedence-collapsed
aggregate. A stuck account must not pin an unattributed banner (or disable
reconciliation) for all accounts.

- The local Compass calendar is its own sidebar section (the signed-in
  user's email) once any Google account exists. It stays visible and
  toggleable. LCV1/LCV2 still exclude it as a create target.
- A connected-but-still-importing account keeps its section header with
  zero calendars so "Adding your calendar…" attributes to that account.
- Day view columns are active+visible calendars, matching Week.

Follow-up candidate: `SidebarStatusBar` names the account when more than one
connection exists.
