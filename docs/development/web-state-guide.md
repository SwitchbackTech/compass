# Web State Management Guide

Reference for the four-layer state model in `packages/web`. Read this before modifying any event-related state, persistence, or async behavior.

## The Four-Layer Model

```
User action (click / keyboard)
        │
        ▼
Redux action dispatched
        │
        ▼
redux-saga (side effects)  ──── calls API or IndexedDB via repository
        │                                    │
        │                                    ▼
        │                          IndexedDB (offline persistence)
        │
        ▼
Elf store update (event entities)
        │
        ▼
React component re-render (via RxJS observables)
        │
        ▼
Redux slice update (async status: loading / success / error)
```

The layers are **intentional and load-bearing** — do not consolidate them.

## When to Use Each Layer

| Concern                                        | Use                           | Key Files                                                             |
| ---------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| Loading states, modal visibility, async status | Redux Toolkit slice           | `packages/web/src/ducks/events/slices/`                               |
| Async sequences: fetch → persist → update UI   | redux-saga                    | `packages/web/src/ducks/events/sagas/event.sagas.ts`                  |
| Event entity CRUD and derived streams          | Elf store                     | `packages/web/src/store/events.ts`                                    |
| Offline persistence (survive page refresh)     | IndexedDB via adapter         | `packages/web/src/common/storage/adapter/indexeddb.adapter.ts`        |
| Which storage backend to use                   | Repository factory            | `packages/web/src/common/repositories/event/event.repository.util.ts` |
| Session and auth state                         | SuperTokens + SessionProvider | `packages/web/src/auth/session/SessionProvider.tsx`                   |

## Event Creation: Step-by-Step Flow

What happens when a user creates an event:

1. Component dispatches `createEventSlice.actions.request(eventData)`
2. Saga `watchCreateEvent` picks up the action
3. Saga calls `getEventRepository(sessionExists)` to decide local vs. remote
4. Saga creates an **optimistic event** (with a temporary `_id`) and upserts it into the Elf store immediately — the UI shows the event before the API responds
5. Saga calls the repository (`local.create` or `remote.create`)
6. On success: saga replaces the optimistic event in the Elf store with the confirmed event (stable `_id` from backend)
7. On failure: saga removes the optimistic event from the Elf store and dispatches an error action to the Redux slice
8. Redux slice updates `createEventSlice.status` so loading spinners and error states reflect the outcome

## Key Entry Points

| Layer              | File                                                                  | What It Does                                     |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------------------ |
| Redux slices       | `packages/web/src/ducks/events/slices/event.slice.ts`                 | Async status for event CRUD operations           |
| Sagas (events)     | `packages/web/src/ducks/events/sagas/event.sagas.ts`                  | Orchestrates all event side effects              |
| Sagas (someday)    | `packages/web/src/ducks/events/sagas/someday.sagas.ts`                | Handles someday/backlog transitions              |
| Elf store          | `packages/web/src/store/events.ts`                                    | Entity store: create/update/delete/select events |
| IndexedDB adapter  | `packages/web/src/common/storage/adapter/indexeddb.adapter.ts`        | Low-level offline persistence                    |
| Repository factory | `packages/web/src/common/repositories/event/event.repository.util.ts` | Selects local vs. remote based on auth state     |
| Redux store root   | `packages/web/src/store/index.ts`                                     | Combines Redux reducers                          |
| Saga root          | `packages/web/src/store/sagas.ts`                                     | Registers all sagas                              |

## Repository Selection Decision Matrix

Canonical source:

- `packages/web/src/common/repositories/event/event.repository.util.ts`
- `packages/web/src/auth/compass/state/auth.state.util.ts`
- `packages/web/src/auth/google/state/google.auth.state.ts`

`getEventRepository(sessionExists)` applies the following order:

| Check order | Condition                                      | Repository | Why |
| ----------- | ---------------------------------------------- | ---------- | --- |
| 1           | `isGoogleRevoked()` is `true`                  | Local      | Prevent repeated remote failures until re-auth. |
| 2           | `hasUserEverAuthenticated()` is `true`         | Remote     | Preserve post-login continuity when local data is empty. |
| 3           | `sessionExists` is `true`                      | Remote     | Active session can use API-backed repositories. |
| 4           | none of the above                              | Local      | Never-authenticated local-first mode. |

Notes:

- Google revoked state is intentionally in-memory (session-scoped), not persisted.
- Re-authentication clears revoked state and restores normal remote preference.
- Components should not call repositories directly; sagas own selection.

## Anonymous Calendar Change Sign-Up Prompt Contract

Canonical source:

- `packages/web/src/ducks/events/sagas/event.sagas.ts`
- `packages/web/src/auth/compass/state/auth.state.util.ts`

The sign-up prompt flag (`shouldPromptSignUpAfterAnonymousCalendarChange`) is set only when all of these are true:

1. no active session (`sessionExists === false`)
2. user has never authenticated (`hasUserEverAuthenticated() === false`)
3. Google is not in revoked mode (`isGoogleRevoked() === false`)

Current write paths that apply this guard:

- `createEvent` saga (after successful repository `create`)
- `editEvent` saga (after successful repository `edit`)

`deleteEvent` and read operations do not set this prompt flag.

## Common AI Mistakes

**1. Putting event entity data in a Redux slice**

Event entities (`Schema_Event` objects) belong in the **Elf store** (`store/events.ts`), not in Redux slices. Redux slices hold async status (`idle | loading | success | error`) and UI flags — not the event objects themselves.

Wrong:

```typescript
// ❌ do not add event arrays to Redux slices
const eventsSlice = createSlice({
  initialState: { events: [] as Schema_Event[] },
  ...
});
```

Right: update `eventsStore` in `store/events.ts` using its exported functions (`updateEvent`, `setDraft`, etc.).

---

**2. Calling IndexedDB directly from a component**

Components must never import the IndexedDB adapter or call repository methods directly. The data flow is:

```
Component → dispatch Redux action → saga → repository → Elf store update → component re-renders
```

If you need to read or write events from a component, dispatch an action and let the saga handle persistence.

---

**3. Forgetting that sagas bridge Redux and the Elf store**

The Elf store (`store/events.ts`) and Redux slices (`ducks/events/slices/`) are separate systems. **Sagas are the only code that updates both.** A saga will:

- Dispatch to a Redux slice to set loading/error status
- Call `upsertEntities` / `updateEvent` / etc. on the Elf store to update event data

Do not try to have Redux reducers update the Elf store, or vice versa.

---

**4. Assuming an optimistic ID is stable**

When a saga creates an event optimistically, it generates a temporary client-side `_id`. This ID is **not stable** — it will be replaced with the backend-assigned ID on confirmation. Do not store optimistic IDs in other state, link them to other entities, or rely on them persisting after the saga completes.
