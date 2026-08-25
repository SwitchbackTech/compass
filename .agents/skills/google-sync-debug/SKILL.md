---
name: google-sync-debug
version: 1
owner: compass-maintainers
last_verified: 2026-08-25
description: Diagnoses Compass Google Calendar sync, OAuth, webhook, job, connection-health, and SSE failures by tracing the correct browser, backend, sync-service, provider, and storage boundary. Use when Google events are stale, imports or watches fail, reconnect is required, sync jobs stall, or connection health reports attention.
---

## When

Google events are stale, watches fail, reconnect is required, or SSE is quiet.

## Steps

Classify symptom → local prerequisites → trace the boundary → narrowest test.

## Output

The failing layer (browser, backend, sync, provider, storage) plus evidence.

## Pass

A named boundary and a command or log that shows it.

## Anti-patterns

Do not guess across layers. See
[`_evals/anti-patterns.md`](../_evals/anti-patterns.md).

## Escalate

OAuth grant, production data repair, or missing Google client secrets.

# Debug Google sync

Find the failing boundary before changing code. Read:

- `docs/features/google-sync-and-sse-flow.md`
- `docs/development/local-development.md`
- `docs/development/testing-playbook.md#testing-realtime-and-sync-changes`

Never print credentials, refresh tokens, internal auth tokens, notification
tokens, or the contents of `compass.yaml`.

## 1. Classify the symptom

Identify the first observable failure:

- OAuth cannot start or complete
- provider connection is missing, revoked, or requires reconnect
- initial import or repair does not finish
- Compass changes do not reach Google
- Google changes do not reach Compass
- backend changes arrive but the browser stays stale
- sync jobs remain pending, leased, or retrying
- health/readiness reports attention

Record user state, environment, effective service URLs, calendar/provider, and
the last successful step without collecting sensitive payloads.

## 2. Verify local prerequisites

Invoke `/local-dev-bootstrap` for incomplete setup.

- Backend, sync service, MongoDB, and web must use the current worktree's
  effective ports.
- Google OAuth credentials and redirect URIs must match the selected port.
- Browser API and SSE traffic can remain local.
- Google watch notifications require a public HTTPS `sync.callbackBaseUrl`
  (proxied as `/sync/*`).
- A local HTTP backend can support OAuth and initial import but not inbound
  Google webhook delivery.

Check backend and sync liveness/readiness before debugging domain logic.

## 3. Trace the relevant path

### Connection and OAuth

Trace web authorization → backend-facing connection API → sync internal auth →
provider auth adapter → encrypted credential custody → connection metadata.
Verify signed OAuth state, callback URL, scopes, and reconnect/revocation state.

### Compass to Google

Trace the browser mutation → backend event command/integration boundary → sync
command/job → provider writer → invalidation/change feed → backend SSE publish →
web query invalidation.

### Google to Compass

Trace provider webhook → notification verification → subscription/resource →
pull job → provider reader → normalized event persistence → invalidation/change
feed → backend SSE → web refetch.

Use correlation/job/resource identifiers where available, but redact provider
payload content in reports.

## 4. Distinguish common failures

- OAuth redirect mismatch is not a webhook reachability failure.
- A successful optimistic UI update does not prove backend or provider
  persistence.
- A successful provider write does not prove invalidation/SSE delivery.
- A healthy SSE connection does not prove the sync job ran.
- Missing Google credentials can leave the sync service healthy but passive.
- Mongo readiness failure should be fixed before investigating provider calls.
- Revoked refresh tokens require reconnect behavior, not retry loops.
- Expired/missing subscriptions should flow through renewal/reconciliation.

## 5. Test the narrowest layer

- Provider-independent logic: focused `packages/sync` unit test
- Storage, leasing, custody, or job behavior: `*.db.test.ts` then
  `bun run test:sync`
- Backend integration/SSE emitter: focused backend test then
  `bun run test:backend`
- Web listener/refetch state: focused web test then `bun run test:web`
- Shared payload/contract: `bun run test:core`, affected consumers, and
  `bun run type-check`

Use test adapters and drivers. Do not call real Google APIs from automated
tests or weaken notification verification to simplify a test.

## Report

State:

1. failing boundary and evidence
2. last confirmed successful boundary
3. root cause or remaining hypotheses, clearly separated
4. safe fix and regression coverage
5. commands/scenarios run
6. setup limitation when live webhook or OAuth behavior could not be exercised
