import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { type Event } from "@core/types/event.contracts";
import { Categories_Event } from "@core/types/event.types";
import { IS_DEV } from "@web/common/constants/env.constants";

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
  dateToResize?: "start" | "end" | null;
}

export interface State_DraftEvent {
  status: Status_DraftEvent | null;
  event: Event | null;
}

export interface Payload_DraftEvent {
  activity: Activity_DraftEvent;
  event: Event | null;
  eventType: Categories_Event;
}

export interface Payload_Draft_Resize {
  category: Categories_Event;
  event: Event;
  dateToChange: "start" | "end";
}

export interface Payload_Draft_Swap {
  event: Event;
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
  event: null,
};

const getEventType = (event: Event) =>
  event.schedule.kind === "allDay"
    ? Categories_Event.ALLDAY
    : event.schedule.kind === "someday"
      ? Categories_Event.SOMEDAY_WEEK
      : Categories_Event.TIMED;

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
        event,
        status: {
          ...(state.status ?? initialDraftStatus),
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

  startGridClick: (event: Event) =>
    useDraftStore.setState(
      {
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

  setEvent: (event: Event | null) =>
    useDraftStore.setState(
      (state) => {
        if (!event) {
          return { event, status: initialDraftStatus };
        }

        return {
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

export const selectDraftActivity = (state: State_DraftEvent) =>
  state.status?.activity;

export const selectDraftCategory = (state: State_DraftEvent) =>
  state.status?.eventType;

export const selectDraftId = (state: State_DraftEvent) => state.event?.id;

export const selectDraftStatus = (state: State_DraftEvent) => state.status;

export const selectIsEventFormOpen = (state: State_DraftEvent) =>
  Boolean(state.status?.isFormOpen) && state.event !== null;

export const selectIsDNDing = (state: State_DraftEvent) =>
  state.status?.activity === "dnd";

export const selectIsDrafting = (state: State_DraftEvent) =>
  state.status?.isDrafting;

export const selectIsDraftingExisting = (state: State_DraftEvent) =>
  state.event !== null;

export const selectIsDraftingSomeday = (state: State_DraftEvent) =>
  state.status?.eventType === Categories_Event.SOMEDAY_WEEK ||
  state.status?.eventType === Categories_Event.SOMEDAY_MONTH;
