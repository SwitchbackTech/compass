import { combineLatestWith, map, shareReplay } from "rxjs/operators";
import {
  createStore,
  distinctUntilArrayItemChanged,
  propsFactory,
} from "@ngneat/elf";
import {
  UIEntitiesRef,
  resetActiveId,
  selectActiveEntity,
  selectActiveId,
  selectAllEntities,
  selectEntities,
  setActiveId,
  unionEntities,
  updateEntities,
  upsertEntitiesById,
  withActiveId,
  withEntities,
  withUIEntities,
} from "@ngneat/elf-entities";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import { compareEventsById } from "../common/utils/event/event.util";

export interface EventUIState {
  _id: string;
}

const {
  withDraft,
  selectDraft,
  setDraft: _setDraft,
  resetDraft: _resetDraft,
  getDraft,
} = propsFactory<
  WithCompassId<Schema_Event> | null,
  "draft",
  { draft: WithCompassId<Schema_Event> | null }
>("draft", {
  initialValue: null,
});

export { getDraft, selectDraft };

export const eventsStore = createStore(
  { name: "events" },
  withEntities<WithCompassId<Schema_Event>, "_id">({
    idKey: "_id",
    initialValue: [],
  }),
  withActiveId(null),
  withDraft(),
  withUIEntities<EventUIState, "_id">({
    idKey: "_id",
    initialValue: [],
  }),
);

export const draft$ = eventsStore.pipe(selectDraft());

export const activeEventId$ = eventsStore.pipe(selectActiveId());

export const activeEvent$ = eventsStore.pipe(selectActiveEntity());

export const events$ = eventsStore
  .combine({
    entities: eventsStore.pipe(selectAllEntities()).pipe(
      combineLatestWith(
        draft$.pipe(map((draft) => (draft === null ? [] : [draft]))),
      ),
      map(([entities, draft]) => [
        ...draft,
        ...entities.filter((e) => e._id !== draft[0]?._id),
      ]),
    ),
    UIEntities: eventsStore.pipe(selectEntities({ ref: UIEntitiesRef })),
  })
  .pipe(unionEntities("_id"), shareReplay());

export const allDayEvents$ = events$.pipe(
  map((events) => events.filter((e) => e.isAllDay)),
  shareReplay(),
  distinctUntilArrayItemChanged(),
);

export const timedEvents$ = events$.pipe(
  map((events) => events.filter((e) => !e.isAllDay).sort(compareEventsById)),
  shareReplay(),
  distinctUntilArrayItemChanged(),
);

export function setActiveEvent(eventId: string) {
  eventsStore.update(setActiveId(eventId));
}

export function resetActiveEvent() {
  eventsStore.update(resetActiveId());
}

export function setEventUIState(event: WithCompassId<Partial<EventUIState>>) {
  eventsStore.update(
    upsertEntitiesById(event._id, {
      creator: () => event,
      updater: (state) => ({ ...state, ...event }),
      ref: UIEntitiesRef,
    }),
  );
}

export function setDraft(event: WithCompassId<Schema_Event>) {
  eventsStore.update(_setDraft(event));
}

export function resetDraft() {
  eventsStore.update(_resetDraft());
}

export function updateEvent(
  event: WithCompassId<Partial<Omit<Schema_Event, "_id">>>,
  uiState?: Partial<Omit<EventUIState, "_id">>,
) {
  eventsStore.update(
    updateEntities(event._id, (storedEvent) => ({ ...storedEvent, ...event })),
    updateEntities(event._id, (state) => ({ ...state, ...uiState }), {
      ref: UIEntitiesRef,
    }),
  );
}
