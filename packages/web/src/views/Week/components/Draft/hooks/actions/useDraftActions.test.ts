import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { Priorities } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  editGridEventDraft,
  gridEventDraftToSchemaEvent,
} from "@web/events/grid-event-draft.adapter";
import { type Activity_DraftEvent } from "@web/events/stores/draft.store";
import {
  type Setters_Draft,
  type State_Draft_Local,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { getDragDurationMinutes } from "./drag-duration.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

let currentState = createInitialState();

const { useDraftActions } =
  require("./useDraftActions") as typeof import("./useDraftActions");

const sourceEvent: Event = {
  id: "0123456789abcdef01234567",
  calendarId: "0123456789abcdef76543210",
  content: { kind: "details", title: "Seed event", description: "" },
  schedule: {
    kind: "timed",
    start: "2024-01-15T10:00:00.000Z",
    end: "2024-01-15T11:30:00.000Z",
    timeZone: "UTC",
  },
  recurrence: { kind: "single" },
  priority: Priorities.UNASSIGNED,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: null,
} as unknown as Event;

const createEditDraft = (
  scheduleOverrides: Partial<{
    start: string;
    end: string;
    isAllDay: boolean;
  }> = {},
): GridEventDraft => {
  const draft = editGridEventDraft(sourceEvent);
  if (!draft || draft.kind !== "edit")
    throw new Error("Expected an edit draft");

  const { isAllDay, start, end } = scheduleOverrides;

  return {
    ...draft,
    values: {
      ...draft.values,
      schedule: isAllDay
        ? {
            kind: "allDay",
            start: new Date(start ?? "2024-01-16T00:00:00.000Z"),
            end: new Date(end ?? "2024-01-17T00:00:00.000Z"),
          }
        : {
            kind: "timed",
            start: new Date(start ?? "2024-01-16T10:00:00.000Z"),
            end: new Date(end ?? "2024-01-16T11:00:00.000Z"),
            timeZone: "UTC",
          },
    },
  };
};

const createNewDraft = (
  scheduleOverrides: Partial<{
    start: string;
    end: string;
    isAllDay: boolean;
  }> = {},
): GridEventDraft => {
  const { isAllDay, start, end } = scheduleOverrides;

  return createGridEventDraft(
    isAllDay
      ? {
          kind: "allDay",
          start: new Date(start ?? "2024-01-16T00:00:00.000Z"),
          end: new Date(end ?? "2024-01-17T00:00:00.000Z"),
        }
      : {
          kind: "timed",
          start: new Date(start ?? "2024-01-16T10:00:00.000Z"),
          end: new Date(end ?? "2024-01-16T11:00:00.000Z"),
          timeZone: "UTC",
        },
  );
};

describe("getDragDurationMinutes", () => {
  const schedule = {
    kind: "timed" as const,
    start: new Date("2024-01-15T10:00:00.000Z"),
    end: new Date("2024-01-15T11:30:00.000Z"),
    timeZone: "UTC",
  };

  it("uses the draft duration before drag status is ready", () => {
    expect(getDragDurationMinutes(schedule, null)).toBe(90);
  });

  it("uses the tracked duration once available", () => {
    expect(
      getDragDurationMinutes(schedule, {
        durationMin: 45,
      }),
    ).toBe(45);
  });
});

const createState = (
  overrides: Partial<State_Draft_Local> = {},
): State_Draft_Local => ({
  dateBeingChanged: "endDate",
  draft: createEditDraft(),
  draftSessionKey: 0,
  dragOffset: { x: 0, y: 0 },
  dragStatus: null,
  isDragging: false,
  isFormOpen: true,
  isFormOpenBeforeDragging: null,
  isResizing: false,
  resizeStatus: null,
  ...overrides,
});

const createSetters = (
  overrides: Partial<Setters_Draft> = {},
): Setters_Draft => ({
  setDateBeingChanged: mock(),
  setDraft: mock(),
  setDragOffset: mock(),
  setDraftSessionKey: mock(),
  setDragStatus: mock(),
  setIsDragging: mock(),
  setIsFormOpen: mock(),
  setIsFormOpenBeforeDragging: mock(),
  setIsResizing: mock(),
  setResizeStatus: mock(),
  ...overrides,
});

const dateCalcs = {} as DateCalcs;

const weekProps = {
  component: {
    endOfView: dayjs("2024-01-21T23:59:59.999Z"),
    startOfView: dayjs("2024-01-15T00:00:00.000Z"),
    week: 3,
  },
  util: {
    getLastNavigationSource: () => "manual",
  },
} as unknown as WeekProps;

const setDraftActivity = (
  activity: Activity_DraftEvent,
  eventType = Categories_Event.TIMED,
) => {
  currentState.events!.draft = currentState.events!.draft ?? {};
  currentState.events!.draft.status = {
    activity,
    dateToResize: null,
    eventType,
    isDrafting: true,
    isFormOpen: false,
  };
};

const renderDraftActions = (draft: GridEventDraft) => {
  const setDraft = mock();
  currentState.events!.draft = {
    ...currentState.events!.draft,
    gridDraft: draft,
    event: gridEventDraftToSchemaEvent(draft),
  };
  const { wrapper } = createStoreWrapper(currentState);
  const { result } = renderHook(
    () =>
      useDraftActions(
        createState({ draft }),
        createSetters({ setDraft }),
        dateCalcs,
        weekProps,
      ),
    { wrapper },
  );

  setDraft.mockClear();

  return { result, setDraft };
};

const expectDraftRange = (
  setDraft: ReturnType<typeof mock>,
  startDate: string,
  endDate: string,
) => {
  const nextDraft = setDraft.mock.calls[0]?.[0] as GridEventDraft;

  expect(dayjs(nextDraft.values.schedule.start).isSame(startDate)).toBe(true);
  expect(dayjs(nextDraft.values.schedule.end).isSame(endDate)).toBe(true);
};

describe("useDraftActions", () => {
  beforeEach(() => {
    const draft = createEditDraft();
    currentState = createInitialState();
    currentState.events!.draft = {
      gridDraft: draft,
      event: gridEventDraftToSchemaEvent(draft),
      status: {
        activity: "eventRightClick",
        dateToResize: null,
        eventType: Categories_Event.TIMED,
        isDrafting: true,
        isFormOpen: false,
      },
    };
  });

  it("creates a new event when duplicating an existing week event", async () => {
    const { queryClient, wrapper } = createStoreWrapper(currentState);
    const { result } = renderHook(
      () =>
        useDraftActions(createState(), createSetters(), dateCalcs, weekProps),
      { wrapper },
    );

    // The default target calendar resolves from the (async, though
    // synchronous-in-practice for anon mode) calendars query; wait for it so
    // duplicateEvent doesn't race an undefined calendar list.
    await waitFor(() => {
      expect(queryClient.getQueryData(["calendars"])).toBeDefined();
    });

    act(() => {
      result.current.duplicateEvent();
    });

    await waitFor(() => {
      const created = queryClient
        .getMutationCache()
        .getAll()
        .map(
          (mutation) =>
            mutation.state.variables as {
              input?: { content?: { title?: string } };
            },
        )
        .find((variables) => variables.input?.content?.title === "Seed event");
      expect(created).toBeDefined();
    });
  });

  it("moves a shortcut-created timed draft by keyboard while preserving duration", () => {
    setDraftActivity("createShortcut");
    const { result, setDraft } = renderDraftActions(
      createNewDraft({
        start: "2024-01-16T10:00:00.000Z",
        end: "2024-01-16T11:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowDown");

    expectDraftRange(
      setDraft,
      "2024-01-16T10:15:00.000Z",
      "2024-01-16T11:15:00.000Z",
    );
  });

  it("moves a mouse-created timed draft by keyboard while preserving duration", () => {
    setDraftActivity("gridClick");
    const { result, setDraft } = renderDraftActions(
      createNewDraft({
        start: "2024-01-16T10:00:00.000Z",
        end: "2024-01-16T11:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowDown");

    expectDraftRange(
      setDraft,
      "2024-01-16T10:15:00.000Z",
      "2024-01-16T11:15:00.000Z",
    );
  });

  it("moves a clicked existing timed event draft by keyboard", () => {
    setDraftActivity("gridClick");
    const { result, setDraft } = renderDraftActions(
      createEditDraft({
        start: "2024-01-16T10:00:00.000Z",
        end: "2024-01-16T11:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowLeft");

    expectDraftRange(
      setDraft,
      "2024-01-15T10:00:00.000Z",
      "2024-01-15T11:00:00.000Z",
    );
  });

  it("moves a keyboard-opened existing timed event draft by keyboard", () => {
    setDraftActivity("keyboardEdit");
    const { result, setDraft } = renderDraftActions(
      createEditDraft({
        start: "2024-01-16T10:00:00.000Z",
        end: "2024-01-16T11:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowRight");

    expectDraftRange(
      setDraft,
      "2024-01-17T10:00:00.000Z",
      "2024-01-17T11:00:00.000Z",
    );
  });

  it("does not move a timed draft past midnight", () => {
    setDraftActivity("createShortcut");
    const { result, setDraft } = renderDraftActions(
      createNewDraft({
        start: "2024-01-16T23:00:00.000Z",
        end: "2024-01-17T00:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowDown");

    expect(setDraft).not.toHaveBeenCalled();
  });

  it("moves a clicked existing all-day event draft horizontally and ignores vertical arrows", () => {
    setDraftActivity("gridClick", Categories_Event.ALLDAY);
    const { result, setDraft } = renderDraftActions(
      createEditDraft({
        isAllDay: true,
        start: "2024-01-16T00:00:00.000Z",
        end: "2024-01-17T00:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowRight");

    expectDraftRange(
      setDraft,
      "2024-01-17T00:00:00.000Z",
      "2024-01-18T00:00:00.000Z",
    );

    setDraft.mockClear();
    result.current.repositionDraftByKeyboard("ArrowDown");

    expect(setDraft).not.toHaveBeenCalled();
  });

  it("moves a shortcut-created all-day draft horizontally and ignores vertical arrows", () => {
    setDraftActivity("createShortcut", Categories_Event.ALLDAY);
    const { result, setDraft } = renderDraftActions(
      createNewDraft({
        isAllDay: true,
        start: "2024-01-16T00:00:00.000Z",
        end: "2024-01-17T00:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowRight");

    expectDraftRange(
      setDraft,
      "2024-01-17T00:00:00.000Z",
      "2024-01-18T00:00:00.000Z",
    );

    setDraft.mockClear();
    result.current.repositionDraftByKeyboard("ArrowDown");

    expect(setDraft).not.toHaveBeenCalled();
  });
});
