# WIP: Frontend Data Flow

## On Startup 
### Store & Dispatch initialized
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

## Runtime
`useGetWeekProps.ts`
- imports the global dispatch from the redux store
- on render:
  - gets all week events: `getWeekEventsSlice.actions.request(...)`
- on submit:
  - if event exists (has an id): updates: 
    - `editEventSlice.actions.request(...)` 
  - if event doesn't exist: creates:
    - `createEventSlice.actions.request(...)`

-> (somehow knows to go to sagas ...)

`sagas.ts`
- Getting Events:
  - `getWeekEventsSaga()` -> `getEventsSaga` using this week as params
  ->
    `events/api.ts`
      - `eventsApi.getEvents`
      - uses `getEventsHelper()` to get events

- Creating Event:
    - `createEventSaga()` triggered
    - calls `eventsApi.createEvent` 
    ->
        `ducks/events/api.ts`
        - `eventsApi.createEvent`:
            - creates event
            - creates new id, adds to running list of events in localStorage




