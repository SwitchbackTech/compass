import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import { afterAll } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { renderHook } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { BehaviorSubject } from "rxjs";

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
  getAgendaEventTitle: (event) => `${event?.title || ""} -`,
  getAgendaEventTime: (d) => (d ? new Date(d).toISOString() : ""),
  getAgendaEventPosition: (date) => 0,
  getNowLinePosition: (date) => 0,
  getEventTimeFromPosition: (_y, dateInView) => dateInView.startOf ? dateInView.startOf('day') : new Date(),
  roundMinutesToNearestFifteen: (minutes) => Math.round(minutes / 15) * 15,
  roundToNearestFifteenWithinHour: (minutes) => Math.min(45, Math.round(minutes / 15) * 15),
  getEventHeight: (_event) => 4,
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
  const real = require("@web/common/hooks/useOpenAtCursor");
  return {
    ...real,
    openFloatingAtCursor,
    closeFloatingAtCursor,
    open$: real.open$,
    nodeId$: real.nodeId$,
    placement$: real.placement$,
    strategy$: real.strategy$,
    reference$: real.reference$,
    isOpenAtCursor: mock(() => false),
    setFloatingReferenceAtCursor: mock(),
    setFloatingOpenAtCursor: mock(),
    setFloatingNodeIdAtCursor: mock(),
    setFloatingPlacementAtCursor: mock(),
    setFloatingStrategyAtCursor: mock(),
    CursorItem: { EventForm: "EventForm" },
    useFloatingOpenAtCursor: real.useFloatingOpenAtCursor,
    useFloatingNodeIdAtCursor: real.useFloatingNodeIdAtCursor,
    useFloatingPlacementAtCursor: real.useFloatingPlacementAtCursor,
    useFloatingStrategyAtCursor: real.useFloatingStrategyAtCursor,
    useFloatingReferenceAtCursor: real.useFloatingReferenceAtCursor,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let onDragEnd: (event: any) => void;

    beforeEach(() => {
      renderHook(() => useEventDNDActions());
      onDragEnd = (useDndMonitor as any).mock.calls[0][0].onDragEnd;
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

      onDragEnd({ active, over });

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

      onDragEnd({ active, over });

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

      onDragEnd({ active, over });

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

      onDragEnd({ active, over });

      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });
  });
});

afterAll(() => {
  mock.restore();
});
