# TanStack Query and Listener Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TanStack Query v5 and injectable Redux Toolkit listener infrastructure without migrating or changing any existing Saga behavior.

**Architecture:** A single query-client factory supplies retry-free clients to production and tests. Each Redux store receives a fresh listener middleware instance whose `extra` dependency contains that store's query client, while the existing Saga middleware remains active. React mounts the matching query client through `QueryClientProvider`; Redux remains the only rendered event-state source.

**Tech Stack:** Bun 1.2.18 workspaces, React 18, TanStack Query v5, Redux Toolkit listener middleware, Redux Saga, Bun Test, React Testing Library, TypeScript 6, Biome.

---

## File structure

- Create `packages/web/src/common/query/query-client.ts`: construct isolated clients and export the production singleton.
- Create `packages/web/src/common/query/query-client.test.ts`: lock retry, stale-time, and cache isolation defaults.
- Create `packages/web/src/common/store/listener-middleware.ts`: construct one listener middleware instance per store with an injected `QueryClient`.
- Create `packages/web/src/common/store/listener-middleware.test.ts`: prove action observation and injected-client access without production event listeners.
- Modify `packages/web/src/store/index.ts`: add `createCompassStore`, retain the production `store` and existing type exports, and compose listener plus Saga middleware.
- Create `packages/web/src/store/store.test.ts`: prove separate store/listener instances and compatible Redux behavior.
- Modify `packages/web/src/components/CompassProvider/CompassProvider.tsx`: mount `QueryClientProvider` and accept optional test dependencies.
- Create `packages/web/src/components/CompassProvider/CompassProvider.test.tsx`: prove the injected client is exposed through React context.
- Modify `packages/web/package.json` and generated `bun.lock`: add TanStack Query using Bun only.

### Task 1: Install TanStack Query with a generated lockfile

**Files:**

- Modify: `packages/web/package.json`
- Modify: `bun.lock`

- [ ] **Step 1: Confirm the repository Bun version**

Run:

```bash
bun --version
```

Expected: `1.2.18`. If it differs, use the repository's declared `packageManager` version before changing dependencies.

- [ ] **Step 2: Add TanStack Query through Bun**

Run:

```bash
bun add --cwd packages/web @tanstack/react-query@^5
```

Expected: Bun updates `packages/web/package.json` and regenerates `bun.lock`; do not edit either lockfile entry manually.

- [ ] **Step 3: Verify the generated lockfile is reproducible**

Run:

```bash
bun install --frozen-lockfile
```

Expected: exit 0 with no lockfile changes.

- [ ] **Step 4: Commit the dependency**

```bash
git add packages/web/package.json bun.lock
git commit -m "deps(web): add tanstack query"
```

### Task 2: Add the Compass query-client factory

**Files:**

- Create: `packages/web/src/common/query/query-client.test.ts`
- Create: `packages/web/src/common/query/query-client.ts`

- [ ] **Step 1: Write the failing query-client tests**

Create `packages/web/src/common/query/query-client.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { createCompassQueryClient } from "./query-client";

describe("createCompassQueryClient", () => {
  test("disables retries and treats completed queries as stale", () => {
    const client = createCompassQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.retry).toBe(false);
    expect(defaults.queries?.staleTime).toBe(0);
    expect(defaults.mutations?.retry).toBe(false);
  });

  test("creates isolated query caches", () => {
    const first = createCompassQueryClient();
    const second = createCompassQueryClient();

    first.setQueryData(["probe"], "first");

    expect(first.getQueryData(["probe"])).toBe("first");
    expect(second.getQueryData(["probe"])).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
bun test --cwd packages/web src/common/query/query-client.test.ts
```

Expected: FAIL because `./query-client` does not exist.

- [ ] **Step 3: Implement the minimal factory and singleton**

Create `packages/web/src/common/query/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export const createCompassQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const queryClient = createCompassQueryClient();
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
bun test --cwd packages/web src/common/query/query-client.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit the query client**

```bash
git add packages/web/src/common/query/query-client.ts packages/web/src/common/query/query-client.test.ts
git commit -m "feat(web): add compass query client"
```

### Task 3: Add listener middleware with QueryClient injection

**Files:**

- Create: `packages/web/src/common/store/listener-middleware.test.ts`
- Create: `packages/web/src/common/store/listener-middleware.ts`

- [ ] **Step 1: Write the failing listener dependency test**

Create `packages/web/src/common/store/listener-middleware.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { configureStore, createAction } from "@reduxjs/toolkit";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { createCompassListenerMiddleware } from "./listener-middleware";

describe("createCompassListenerMiddleware", () => {
  test("observes actions with the injected query client", async () => {
    const queryClient = createCompassQueryClient();
    const listenerMiddleware = createCompassListenerMiddleware(queryClient);
    const probe = createAction("listener/probe");
    let observedClient: unknown;

    listenerMiddleware.startListening({
      actionCreator: probe,
      effect: (_action, listenerApi) => {
        observedClient = listenerApi.extra.queryClient;
      },
    });

    const store = configureStore({
      reducer: (state = {}) => state,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(listenerMiddleware.middleware),
    });

    store.dispatch(probe());
    await Promise.resolve();

    expect(observedClient).toBe(queryClient);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
bun test --cwd packages/web src/common/store/listener-middleware.test.ts
```

Expected: FAIL because `./listener-middleware` does not exist.

- [ ] **Step 3: Implement the typed middleware factory**

Create `packages/web/src/common/store/listener-middleware.ts`:

```ts
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { type QueryClient } from "@tanstack/react-query";

export interface CompassListenerDependencies {
  queryClient: QueryClient;
}

export const createCompassListenerMiddleware = (queryClient: QueryClient) =>
  createListenerMiddleware({
    extra: {
      queryClient,
    } satisfies CompassListenerDependencies,
  });
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
bun test --cwd packages/web src/common/store/listener-middleware.test.ts
```

Expected: 1 test passes with no console warnings.

- [ ] **Step 5: Commit listener infrastructure**

```bash
git add packages/web/src/common/store/listener-middleware.ts packages/web/src/common/store/listener-middleware.test.ts
git commit -m "feat(web): add query-aware listener middleware"
```

### Task 4: Make Redux store construction injectable

**Files:**

- Create: `packages/web/src/store/store.test.ts`
- Modify: `packages/web/src/store/index.ts`

- [ ] **Step 1: Write the failing store-factory test**

Create `packages/web/src/store/store.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { createCompassStore } from "./index";

describe("createCompassStore", () => {
  test("creates isolated stores with isolated query dependencies", () => {
    const first = createCompassStore({
      queryClient: createCompassQueryClient(),
    });
    const second = createCompassStore({
      queryClient: createCompassQueryClient(),
    });

    first.dispatch(viewSlice.actions.toggleSidebar());

    expect(first).not.toBe(second);
    expect(first.getState().view.sidebar.isOpen).toBe(false);
    expect(second.getState().view.sidebar.isOpen).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
bun test --cwd packages/web src/store/store.test.ts
```

Expected: FAIL because `createCompassStore` is not exported.

- [ ] **Step 3: Implement store construction without changing Saga ownership**

Replace the store construction portion of `packages/web/src/store/index.ts` with:

```ts
import { configureStore } from "@reduxjs/toolkit";
import { type QueryClient } from "@tanstack/react-query";
import { queryClient as defaultQueryClient } from "@web/common/query/query-client";
import { createCompassListenerMiddleware } from "@web/common/store/listener-middleware";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { reducers } from "./reducers";

export interface CreateCompassStoreOptions {
  queryClient?: QueryClient;
}

export const createCompassStore = ({
  queryClient = defaultQueryClient,
}: CreateCompassStoreOptions = {}) => {
  const listenerMiddleware = createCompassListenerMiddleware(queryClient);

  return configureStore({
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(listenerMiddleware.middleware)
        .concat(sagaMiddleware),
  });
};

export const store = createCompassStore();
```

Keep the existing E2E exposure and these exports below it unchanged:

```ts
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

Do not move `sagaMiddleware.run(sagas)` from `packages/web/src/index.tsx` and do not register event listeners.

- [ ] **Step 4: Run the store and Saga regression tests**

Run:

```bash
bun test --cwd packages/web \
  src/store/store.test.ts \
  src/ducks/events/sagas/event.sagas.test.ts \
  src/ducks/events/sagas/someday.sagas.test.ts
```

Expected: all tests pass; existing Saga request handling remains active.

- [ ] **Step 5: Commit the injectable store**

```bash
git add packages/web/src/store/index.ts packages/web/src/store/store.test.ts
git commit -m "refactor(web): inject query client into store"
```

### Task 5: Mount QueryClientProvider with test injection

**Files:**

- Create: `packages/web/src/components/CompassProvider/CompassProvider.test.tsx`
- Modify: `packages/web/src/components/CompassProvider/CompassProvider.tsx`

- [ ] **Step 1: Write the failing provider test**

Create `packages/web/src/components/CompassProvider/CompassProvider.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { CompassRequiredProviders } from "./CompassProvider";

test("provides the injected query client", () => {
  const queryClient = createCompassQueryClient();

  function Probe() {
    const observedClient = useQueryClient();
    return (
      <output aria-label="query client match">
        {String(observedClient === queryClient)}
      </output>
    );
  }

  render(
    <CompassRequiredProviders queryClient={queryClient}>
      <Probe />
    </CompassRequiredProviders>,
  );

  expect(screen.getByLabelText("query client match")).toHaveTextContent("true");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
bun test --cwd packages/web src/components/CompassProvider/CompassProvider.test.tsx
```

Expected: FAIL because `CompassRequiredProviders` does not accept or mount a query client.

- [ ] **Step 3: Add QueryClientProvider to the required provider tree**

In `packages/web/src/components/CompassProvider/CompassProvider.tsx`, add imports:

```ts
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { queryClient as defaultQueryClient } from "@web/common/query/query-client";
```

Define focused props:

```ts
interface CompassRequiredProvidersProps extends PropsWithChildren {
  queryClient?: QueryClient;
  store?: typeof store;
}
```

Change the component signature and wrap the existing tree:

```tsx
export const CompassRequiredProviders = ({
  children,
  queryClient = defaultQueryClient,
  store: reduxStore = store,
}: CompassRequiredProvidersProps) => (
  <QueryClientProvider client={queryClient}>
    <HotkeysProvider>
      <CompassRefsProvider>
        <SessionProvider>
          <Provider store={reduxStore}>
            <GoogleOAuthProvider
              clientId={ENV_WEB.GOOGLE_CLIENT_ID || "google-not-configured"}
            >
              <PointerPositionProvider>
                <IconProvider>
                  <AuthModalProvider>
                    <LogoutConfirmationProvider>
                      {children}
                      <AuthModal />
                      <WelcomeModal />
                      <ToastContainer
                        position="bottom-left"
                        autoClose={5000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme="dark"
                        limit={1}
                        transition={Slide}
                      />
                    </LogoutConfirmationProvider>
                  </AuthModalProvider>
                </IconProvider>
              </PointerPositionProvider>
            </GoogleOAuthProvider>
          </Provider>
        </SessionProvider>
      </CompassRefsProvider>
    </HotkeysProvider>
  </QueryClientProvider>
);
```

- [ ] **Step 4: Run provider and app-facing tests**

Run:

```bash
bun test --cwd packages/web \
  src/components/CompassProvider/CompassProvider.test.tsx
```

Expected: the provider test passes without context or console errors.

- [ ] **Step 5: Commit provider wiring**

```bash
git add packages/web/src/components/CompassProvider/CompassProvider.tsx packages/web/src/components/CompassProvider/CompassProvider.test.tsx
git commit -m "feat(web): provide compass query client"
```

### Task 6: Simplify and verify the complete slice

**Files:**

- Review: all files changed since the design commit
- Modify only if required: files already listed in Tasks 1-5

- [ ] **Step 1: Review the diff for unnecessary surface area**

Run:

```bash
git diff 2e3d31614 -- packages/web package.json bun.lock
rg -n 'redux-saga|sagaMiddleware\.run|from "@web/store/sagas"' packages/web/src
```

Expected: the diff contains only dependency, query client, listener, store factory, provider, and tests. Saga files, imports, startup, and tests remain present.

- [ ] **Step 2: Run all focused infrastructure tests**

Run:

```bash
bun test --cwd packages/web \
  src/common/query/query-client.test.ts \
  src/common/store/listener-middleware.test.ts \
  src/components/CompassProvider/CompassProvider.test.tsx \
  src/store/store.test.ts
```

Expected: all focused tests pass with zero failures.

- [ ] **Step 3: Run the full required verification**

Run each command separately and inspect its exit code:

```bash
bun install --frozen-lockfile
bun test:web
bun type-check
bun lint
npx -y react-doctor@latest . --verbose --diff
```

Expected: install, tests, type-check, and lint exit 0. React Doctor reports no score regression; fix any new error or warning caused by this diff and rerun the affected checks.

- [ ] **Step 4: Verify the acceptance boundary explicitly**

Run:

```bash
git diff --check
git status --short
rg -n 'redux-saga' packages/web/package.json packages/web/src
rg -n 'sagaMiddleware\.run' packages/web/src/index.tsx packages/web/src
```

Expected: no whitespace errors; only intended files are changed; `redux-saga`, Saga startup, and Saga source/tests still exist because removal is outside this slice.

- [ ] **Step 5: Commit any verification-only cleanup**

If verification required source cleanup, commit only those reviewed changes:

```bash
git add \
  packages/web/src/common/query/query-client.ts \
  packages/web/src/common/query/query-client.test.ts \
  packages/web/src/common/store/listener-middleware.ts \
  packages/web/src/common/store/listener-middleware.test.ts \
  packages/web/src/store/index.ts \
  packages/web/src/store/store.test.ts \
  packages/web/src/components/CompassProvider/CompassProvider.tsx \
  packages/web/src/components/CompassProvider/CompassProvider.test.tsx
git commit -m "refactor(web): simplify query infrastructure"
```

If no cleanup was needed, do not create an empty commit.
