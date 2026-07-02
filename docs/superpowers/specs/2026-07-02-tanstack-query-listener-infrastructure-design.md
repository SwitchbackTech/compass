# TanStack Query and Listener Infrastructure Design

## Goal

Prepare Compass Web for an incremental Redux Saga migration without changing
event behavior. This slice adds TanStack Query v5, a shared query client,
provider wiring, and injectable Redux Toolkit listener middleware while keeping
all Saga handling active and unchanged.

## Scope

This PR-sized slice will:

- Add `@tanstack/react-query` using Bun and commit the generated `bun.lock`.
- Add a `createCompassQueryClient` factory with automatic retries disabled.
- Create one production `QueryClient` and mount `QueryClientProvider` in the
  existing application provider tree.
- Add Redux Toolkit listener middleware alongside Saga middleware.
- Provide a store factory that accepts an isolated `QueryClient`, while
  preserving the existing exported production store and its types.
- Update test helpers to create fresh stores and query clients where the new
  infrastructure is exercised.
- Add focused tests for query-client configuration, provider wiring, store
  dependency injection, and listener startup.

This slice will not:

- Register listeners for existing event request actions.
- Add event query keys or execute repository reads through TanStack Query.
- Change Redux state, selectors, rendered data, loading state, or mutations.
- Remove or modify Saga startup, Saga middleware, generator implementations,
  or Saga tests.
- Add prefetching, undo/redo, Query-owned rendering, or broader Redux removal.

## Architecture

### Query client

`createCompassQueryClient` is the sole construction path for Compass query
clients. Its defaults disable query and mutation retries so failures retain
their current timing. Queries use an explicit stale-time policy suitable for
the upcoming migration: reads can share an in-flight request, but completed
results are immediately stale and therefore do not become a rendered-data
authority.

The production module exports one shared client. Tests create a fresh client
per test to prevent cache and observer state leaking across the Bun test
process.

### Provider wiring

`QueryClientProvider` is mounted in `CompassRequiredProviders`. The component
accepts an optional query client next to its existing optional Redux store so
tests can inject isolated dependencies. Production callers continue using the
shared defaults without API changes.

TanStack Query provides orchestration only. React components do not read event
entities or loading state from the query cache in this slice.

### Store and middleware

Store creation moves behind a `createCompassStore` factory. The factory accepts
an optional `QueryClient` and composes Redux Toolkit listener middleware with
the existing Saga middleware. The production `store` remains a singleton made
by this factory, preserving current imports, `RootState`, `AppDispatch`, and the
E2E store exposure.

Listener construction is isolated so each store gets its own middleware
instance. Listener dependencies include that store's `QueryClient`; future
event listeners can therefore call `fetchQuery` without importing a global
client. No listener subscribes to an existing request action yet, preventing
Saga and listener middleware from executing the same operation.

### Listener startup proof

A test-only focused listener verifies that middleware created for a store can
observe a dispatched action and access the injected query client. This proves
the dependency boundary and middleware startup without migrating production
event behavior or adding placeholder production listeners.

## Data flow

Production startup follows this sequence:

1. Create the shared Compass query client.
2. Create the listener middleware with that client as an injected dependency.
3. Create the Redux store with default middleware, listener middleware, and
   Saga middleware.
4. Start the existing root Saga exactly as before.
5. Mount React under `QueryClientProvider` and Redux `Provider`.

Existing Redux request actions continue flowing only to Saga handlers. The
query cache remains unused for event operations until a later vertical slice.

## Error and lifecycle behavior

This infrastructure introduces no new network operations. Disabling retries
prevents future Query-backed operations from silently changing current failure
timing. Fresh test clients are explicitly cleared or allowed to become
unreferenced during teardown so cache state cannot affect later tests.

Because no event listener is registered, cancellation, latest-request-wins,
optimistic updates, rollback, and pending-ID cleanup remain the responsibility
of existing Sagas in this slice. Those behaviors will move only alongside
listener parity tests in later slices.

## Testing and verification

Focused tests will prove:

- `createCompassQueryClient` disables automatic query and mutation retries and
  applies the intended stale-time policy.
- `CompassRequiredProviders` accepts an injected query client and makes it
  available through TanStack Query context.
- Two stores can be created with separate query clients and listener instances.
- A listener can observe an action and access the query client injected into
  its middleware dependencies.
- Existing production store exports remain compatible.

Verification for this slice:

```bash
bun install
bun install --frozen-lockfile
bun test --cwd packages/web \
  src/common/query/query-client.test.ts \
  src/common/store/listener-middleware.test.ts \
  src/components/CompassProvider/CompassProvider.test.tsx \
  src/store/store.test.ts
bun test:web
bun type-check
bun lint
npx -y react-doctor@latest . --verbose --diff
```

The generated `bun.lock` is accepted only if both install commands succeed.
Saga imports, files, startup, and tests are expected to remain after this PR.

## Follow-up boundary

The next PR should migrate one low-risk event read path with a query-key factory
and listener integration tests. It must keep Redux as the rendered state source
and prove latest-request-wins behavior before any corresponding Saga handler or
test is removed.
