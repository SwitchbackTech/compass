import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { IS_DEV } from "@web/common/constants/env.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";

// TODO(packet-03-phase-3c): migrate remaining consumers from the legacy
// `event` projection to `gridDraft`, then remove the projection. This store
// remains the single draft store while Day, forms, sidebar, and legacy Week
// interactions transition.

export type Activity_DraftEvent =
  | "createShortcut"
  | "dnd"
  | "eventRightClick"
  | "gridClick"
  | "keyboardEdit"
  | "resizing"
  | "sidebarClick";

export interface Status_DraftEvent {
  activity: Activity_DraftEvent | null;
  eventType?: Categories_Event | null;
  isDrafting: boolean;
  /**
   * Whether the floating event form is shown for the current draft. Kept
   * separate from `isDrafting`/`activity` because a draft can exist without the
   * form being open (e.g. while drag-creating a timed event, the draft renders
   * but the form stays closed until the gesture finishes).
   */
  isFormOpen: boolean;
  dateToResize?: "startDate" | "endDate" | null;
}

export interface State_DraftEvent {
  status: Status_DraftEvent | null;
  /** Canonical draft for migrated grid creation paths. */
  gridDraft: GridEventDraft | null;
  /**
   * Temporary projection for Day, forms, sidebar, and legacy Week draft
   * interactions. Do not add another store while those consumers migrate.
   */
  event: Schema_Event | null;
}

export interface Payload_DraftEvent {
  activity: Activity_DraftEvent;
  event: Schema_Event | null;
  eventType: Categories_Event;
}

export interface Payload_Draft_Resize {
  category: Categories_Event;
  event: Schema_Event;
  dateToChange: "startDate" | "endDate";
}

export interface Payload_Draft_Swap {
  event: Schema_GridEvent;
  category: Categories_Event;
}

const initialDraftStatus: Status_DraftEvent = {
  activity: null,
  isDrafting: false,
  isFormOpen: false,
  eventType: null,
  dateToResize: null,
};

export const initialDraftState: State_DraftEvent = {
  status: initialDraftStatus,
  gridDraft: null,
  event: null,
};

const getEventType = (event: Schema_Event) =>
  event.isAllDay ? Categories_Event.ALLDAY : Categories_Event.TIMED;

// Selectors passed to this hook must return primitives or stable references;
// a selector that builds a new object/array each call needs `useShallow`.
export const useDraftStore = create<State_DraftEvent>()(
  devtools(() => initialDraftState, {
    name: "compass/draft",
    enabled: IS_DEV,
  }),
);

export const draftActions = {
  discard: () =>
    useDraftStore.setState(initialDraftState, true, { type: "discard" }),

  start: ({ activity, event, eventType }: Payload_DraftEvent) =>
    useDraftStore.setState(
      (state) => ({
        gridDraft: null,
        event,
        status: {
          ...(state.status ?? initialDraftStatus),
          activity,
          isDrafting: true,
          isFormOpen: false,
          eventType,
        },
      }),
      false,
      { type: "start" },
    ),

  startResizing: ({ category, event, dateToChange }: Payload_Draft_Resize) =>
    useDraftStore.setState(
      (state) => ({
        gridDraft: null,
        event,
        status: {
          ...state.status,
          activity: "resizing" as const,
          dateToResize: dateToChange,
          eventType: category,
          isDrafting: true,
          isFormOpen: false,
        },
      }),
      false,
      { type: "startResizing" },
    ),

  startDnd: () =>
    useDraftStore.setState(
      (state) => ({
        status: {
          ...state.status,
          activity: "dnd" as const,
          isDrafting: true,
          isFormOpen: false,
        },
      }),
      false,
      { type: "startDnd" },
    ),

  startGridClick: (event: Schema_Event) =>
    useDraftStore.setState(
      {
        gridDraft: null,
        event,
        status: {
          ...initialDraftStatus,
          activity: "gridClick",
          eventType: getEventType(event),
          isDrafting: true,
        },
      },
      false,
      { type: "startGridClick" },
    ),

  setEvent: (event: Schema_Event | null) =>
    useDraftStore.setState(
      (state) => {
        if (!event) {
          return { gridDraft: null, event, status: initialDraftStatus };
        }

        return {
          gridDraft: null,
          event,
          status: {
            ...(state.status ?? initialDraftStatus),
            activity: state.status?.activity ?? "gridClick",
            eventType: getEventType(event),
            isDrafting: true,
          },
        };
      },
      false,
      { type: "setEvent" },
    ),

  swap: ({ category, event }: Payload_Draft_Swap) =>
    useDraftStore.setState(
      {
        gridDraft: null,
        event,
        status: {
          ...initialDraftStatus,
          isDrafting: true,
          eventType: category,
        },
      },
      false,
      { type: "swap" },
    ),

  startGridDraft: ({
    activity,
    dateToResize = null,
    draft,
  }: {
    activity: Extract<
      Activity_DraftEvent,
      | "createShortcut"
      | "eventRightClick"
      | "gridClick"
      | "keyboardEdit"
      | "resizing"
    >;
    dateToResize?: "startDate" | "endDate" | null;
    draft: GridEventDraft;
  }) =>
    useDraftStore.setState(
      (state) => ({
        gridDraft: draft,
        event: gridEventDraftToSchemaEvent(draft),
        status: {
          ...(state.status ?? initialDraftStatus),
          activity,
          dateToResize,
          eventType:
            draft.values.schedule.kind === "allDay"
              ? Categories_Event.ALLDAY
              : Categories_Event.TIMED,
          isDrafting: true,
          isFormOpen: false,
        },
      }),
      false,
      { type: "startGridDraft" },
    ),

  setFormOpen: (isFormOpen: boolean) =>
    useDraftStore.setState(
      (state) => ({
        status: {
          ...(state.status ?? initialDraftStatus),
          isFormOpen,
        },
      }),
      false,
      { type: "setFormOpen" },
    ),
};

export const selectDraft = (state: State_DraftEvent) => state.event;

export const selectGridDraft = (state: State_DraftEvent) => state.gridDraft;

export const selectDraftActivity = (state: State_DraftEvent) =>
  state.status?.activity;

export const selectDraftCategory = (state: State_DraftEvent) =>
  state.status?.eventType;

export const selectDraftId = (state: State_DraftEvent) => state.event?._id;

export const selectDraftStatus = (state: State_DraftEvent) => state.status;

export const selectIsEventFormOpen = (state: State_DraftEvent) =>
  Boolean(state.status?.isFormOpen) && state.event !== null;

export const selectIsDNDing = (state: State_DraftEvent) =>
  state.status?.activity === "dnd";

export const selectIsDrafting = (state: State_DraftEvent) =>
  state.status?.isDrafting;

export const selectIsDraftingExisting = (state: State_DraftEvent) =>
  state.event?._id !== undefined;

export const selectIsDraftingSomeday = (state: State_DraftEvent) =>
  state.status?.eventType === Categories_Event.SOMEDAY_WEEK ||
  state.status?.eventType === Categories_Event.SOMEDAY_MONTH;
