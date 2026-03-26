# Frontend Data Flow

## Big Picture

### Mental Model

Here is how I think about what pieces of the app are responsible for what

| Piece            | Responsibility                        | How                                                   | Where                         |
| ---------------- | ------------------------------------- | ----------------------------------------------------- | ----------------------------- |
| draft event      | Quick, understandable, testable       | minimal schema                                        | draft functions               |
| event (frontend) | exhaustive copy of event from backend | normalizes GET response, exhaustive schema            | Redux store                   |
| middleware       | convert draft -> regular event        | adds/derives values & validates against types/schemas | frontend typescript functions |
| event (backend)  | validates event and persists          | zod, node, mongoDB, exhaustive schema                 | /backend package              |

## Redux Data Flow

The frontend uses Redux, Redux Saga, and React to manage state.
It can be difficult to understand how all of this fits together.
This might help.

### On Startup

#### Store & Dispatch initialized

`ducks/events/slice.ts`

- each slice is initialized with name, props, and reducer
- all slices/reducers are combined into an `eventsReducer`
  ->
  `store/reducers.ts`
- those events reducers are added to the global `reducers` object
  ->
  `store/index.ts`
- adds all those reducers to the redux store
- uses store to init `RootState` and `AppDispatch`

### Runtime - Events

The event flow follows this pattern:

1. **Component** (e.g., `useWeek.ts` or similar hook/component):
   - Imports the global dispatch from the Redux store
   - On render: dispatches `getWeekEventsSlice.actions.request(...)` to fetch events
   - On submit:
     - If event exists (has an id): dispatches `editEventSlice.actions.request(...)`
     - If event doesn't exist: dispatches `createEventSlice.actions.request(...)`

2. **Redux Saga** (`sagas.ts`):
   - Listens for dispatched actions
   - **Getting Events**: `getWeekEventsSaga()` → `getEventsSaga()` → calls `eventsApi.getEvents()` in `events/api.ts`
   - **Creating Event**: `createEventSaga()` → calls `eventsApi.createEvent()` in `ducks/events/api.ts`
     - Creates event with new ID
     - Adds to running list of events in localStorage (for optimistic updates)

3. **API Layer** (`events/api.ts` or `ducks/events/api.ts`):
   - Makes HTTP requests to the backend API
   - Handles responses and updates the Redux store

### Runtime - Someday List

The Someday list follows a similar pattern:

1. **Component** (`EventsList`):
   - Calls `getEvents()` on load to fetch someday events

2. **Redux Selector** (`selectors.ts`):
   - `SidebarEventContainer` uses `mapStateToProps` to connect to Redux
   - Finds events from the `entities` slice that match someday criteria
