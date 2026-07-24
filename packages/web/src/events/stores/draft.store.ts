import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";
import { Categories_Event } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";

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
  /** Canonical draft for grid creation, editing, and form paths. */
  gridDraft: GridEventDraft | null;
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
};

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

  setGridDraft: (draft: GridEventDraft | null) =>
    useDraftStore.setState(
      (state) => ({
        gridDraft: draft,
        status: draft
          ? {
              ...(state.status ?? initialDraftStatus),
              eventType:
                draft.values.schedule.kind === "allDay"
                  ? Categories_Event.ALLDAY
                  : Categories_Event.TIMED,
              isDrafting: true,
            }
          : initialDraftStatus,
      }),
      false,
      { type: "setGridDraft" },
    ),

  // No-op when already at the requested value: Week's draft effects call this
  // redundantly, and a fresh `status` object each time would re-render every
  // `selectDraftStatus` subscriber.
  setFormOpen: (isFormOpen: boolean) =>
    useDraftStore.setState(
      (state) =>
        Boolean(state.status?.isFormOpen) === isFormOpen
          ? {}
          : {
              status: {
                ...(state.status ?? initialDraftStatus),
                isFormOpen,
              },
            },
      false,
      { type: "setFormOpen" },
    ),
};

export const selectGridDraft = (state: State_DraftEvent) => state.gridDraft;

export const selectDraftActivity = (state: State_DraftEvent) =>
  state.status?.activity;

export const selectDraftCategory = (state: State_DraftEvent) =>
  state.status?.eventType;

export const selectDraftId = (state: State_DraftEvent) =>
  state.gridDraft
    ? state.gridDraft.kind === "edit"
      ? state.gridDraft.source.id
      : state.gridDraft.clientId
    : undefined;

export const selectDraftStatus = (state: State_DraftEvent) => state.status;

export const selectIsEventFormOpen = (state: State_DraftEvent) =>
  Boolean(state.status?.isFormOpen) && state.gridDraft !== null;

export const selectIsDNDing = (state: State_DraftEvent) =>
  state.status?.activity === "dnd";

export const selectIsDrafting = (state: State_DraftEvent) =>
  state.status?.isDrafting;

export const selectIsDraftingExisting = (state: State_DraftEvent) =>
  state.gridDraft?.kind === "edit";
