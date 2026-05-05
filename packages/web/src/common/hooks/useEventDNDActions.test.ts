import { type DragEndEvent } from "@dnd-kit/core";
import { renderHook } from "@testing-library/react";
import { BehaviorSubject } from "rxjs";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";

// Mock definitions
const useDndMonitor = mock();
const dndKitQuery = "@dnd-kit/core?test=use-event-dnd-actions";
const mockUpdateEvent = mock();
const mockDispatch = mock();
const mockGetSnappedMinutes = mock();
const mockSelectEventById = mock();
const openFloatingAtCursor = mock();
const closeFloatingAtCursor = mock();
const open$ = new BehaviorSubject(false);
const nodeId$ = new BehaviorSubject(null);
const placement$ = new BehaviorSubject("right-start");
const strategy$ = new BehaviorSubject("absolute");
const reference$ = new BehaviorSubject(null);

mock.module(dndKitQuery, () => ({
  useDndMonitor,
}));

mock.module("@web/common/hooks/useUpdateEvent", () => ({
  useUpdateEvent: mock(() => mockUpdateEvent),
}));

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: mock(() => mockDispatch),
}));

mock.module("@web/views/Day/util/agenda/agenda.util", () => ({
  // Provide a focused mock that includes the named export consumers expect.
  // Keep a safe default for other exports so concurrent tests won't break imports.
  getSnappedMinutes: mockGetSnappedMinutes,
  getAgendaEventTitle: (event: Schema_Event) => `${event.title ?? ""} -`,
  getAgendaEventTime: (date: Date | string) =>
    date ? new Date(date).toISOString() : "",
  getAgendaEventPosition: (_date: Date) => 0,
  getNowLinePosition: (_date: Date) => 0,
  getEventTimeFromPosition: (_y: number, dateInView: Dayjs) =>
    dateInView.startOf("day"),
  roundMinutesToNearestFifteen: (minutes: number) =>
    Math.round(minutes / 15) * 15,
  roundToNearestFifteenWithinHour: (minutes: number) =>
    Math.min(45, Math.round(minutes / 15) * 15),
  getEventHeight: (_event: Pick<Schema_Event, "startDate" | "endDate">) => 4,
}));

mock.module("@web/ducks/events/selectors/event.selectors", () => ({
  selectEventById: mockSelectEventById,
}));

mock.module("@web/store", () => ({
  store: {
    getState: mock(),
  },
}));

mock.module("@web/common/hooks/useOpenAtCursor", () => {
  return {
    openFloatingAtCursor,
    closeFloatingAtCursor,
    open$,
    nodeId$,
    placement$,
    strategy$,
    reference$,
    isOpenAtCursor: mock(() => false),
    setFloatingReferenceAtCursor: mock(),
    setFloatingOpenAtCursor: mock(),
    setFloatingNodeIdAtCursor: mock(),
    setFloatingPlacementAtCursor: mock(),
    setFloatingStrategyAtCursor: mock(),
    CursorItem: {
      EventContextMenu: "EventContextMenu",
      EventForm: "EventForm",
      EventPreview: "EventPreview",
    },
  };
});

const transpiler = new Bun.Transpiler();

const useEventDNDActionsSource = await readFile(
  new URL("./useEventDNDActions.ts", import.meta.url),
  "utf8",
);
const useEventDNDActionsJavaScript = transpiler.transformSync(
  useEventDNDActionsSource.replaceAll(
    "@dnd-kit/core",
    "@dnd-kit/core?test=use-event-dnd-actions",
  ),
  "ts",
);

const useEventDNDActionsTempUrl = new URL(
  `./.useEventDNDActions-${process.pid}-${Date.now()}.mjs`,
  import.meta.url,
);
await writeFile(useEventDNDActionsTempUrl, useEventDNDActionsJavaScript);

const { useEventDNDActions } = await import(useEventDNDActionsTempUrl.href);

type DndMonitorCall = [{ onDragEnd: (event: DragEndEvent) => void }];
type DndMonitorMock = typeof useDndMonitor & {
  mock: { calls: DndMonitorCall[] };
};

describe("useEventDNDActions", () => {
  const mockEvent = {
    _id: "event-1",
    startDate: "2023-01-01T10:00:00.000Z",
    endDate: "2023-01-01T11:00:00.000Z",
    isAllDay: false,
  };

  beforeEach(() => {
    mockUpdateEvent.mockClear();
    mockDispatch.mockClear();
    mockGetSnappedMinutes.mockClear();
    mockSelectEventById.mockClear();

    mockSelectEventById.mockReturnValue(mockEvent);
  });

  it("should register dnd monitor", () => {
    renderHook(() => useEventDNDActions());
    expect(useDndMonitor).toHaveBeenCalledWith(
      expect.objectContaining({
        onDragEnd: expect.any(Function),
      }),
    );
  });

  describe("onDragEnd", () => {
    let onDragEnd: (event: DragEndEvent) => void;

    beforeEach(() => {
      renderHook(() => useEventDNDActions());
      onDragEnd = (useDndMonitor as DndMonitorMock).mock.calls[0][0].onDragEnd;
    });

    it("should handle timed event move in main grid", () => {
      mockGetSnappedMinutes.mockReturnValue(60); // Moved 1 hour

      const active = {
        data: {
          current: {
            view: "day",
            type: Categories_Event.TIMED,
            event: mockEvent,
          },
        },
      };
      const over = { id: ID_GRID_MAIN };

      onDragEnd({ active, over } as unknown as DragEndEvent);

      const expectedStartDate = dayjs(mockEvent.startDate)
        .startOf("day")
        .add(60, "minute")
        .toISOString();
      const expectedEndDate = dayjs(expectedStartDate)
        .add(60, "minute")
        .toISOString();

      expect(mockUpdateEvent).toHaveBeenCalledWith(
        {
          event: expect.objectContaining({
            ...mockEvent,
            startDate: expectedStartDate,
            endDate: expectedEndDate,
          }),
        },
        true,
      );
    });

    it("should handle all-day event move to main grid", () => {
      mockGetSnappedMinutes.mockReturnValue(120); // Moved 2 hours

      const allDayEvent = { ...mockEvent, isAllDay: true };
      const active = {
        data: {
          current: {
            view: "day",
            type: Categories_Event.ALLDAY,
            event: allDayEvent,
          },
        },
      };
      const over = { id: ID_GRID_MAIN };

      onDragEnd({ active, over } as unknown as DragEndEvent);

      const expectedStartDate = dayjs(allDayEvent.startDate)
        .startOf("day")
        .add(120, "minute")
        .toISOString();
      const expectedEndDate = dayjs(expectedStartDate)
        .add(15, "minute")
        .toISOString();

      expect(mockUpdateEvent).toHaveBeenCalledWith(
        {
          event: expect.objectContaining({
            ...allDayEvent,
            isAllDay: false,
            startDate: expectedStartDate,
            endDate: expectedEndDate,
          }),
        },
        true,
      );
    });

    it("should handle timed event move to all-day grid", () => {
      const active = {
        data: {
          current: {
            view: "day",
            type: Categories_Event.TIMED,
            event: mockEvent,
          },
        },
      };
      const over = { id: ID_GRID_ALLDAY_ROW };

      onDragEnd({ active, over } as unknown as DragEndEvent);

      const expectedStartDate = dayjs(mockEvent.startDate)
        .startOf("day")
        .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
      const expectedEndDate = dayjs(mockEvent.endDate)
        .startOf("day")
        .add(1, "day")
        .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

      expect(mockUpdateEvent).toHaveBeenCalledWith(
        {
          event: expect.objectContaining({
            ...mockEvent,
            isAllDay: true,
            startDate: expectedStartDate,
            endDate: expectedEndDate,
          }),
        },
        true,
      );
    });

    it("should ignore invalid drag end events", () => {
      const active = { data: { current: null } };
      const over = null;

      onDragEnd({ active, over } as unknown as DragEndEvent);

      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });
  });
});

afterAll(() => {
  mock.restore();
});
