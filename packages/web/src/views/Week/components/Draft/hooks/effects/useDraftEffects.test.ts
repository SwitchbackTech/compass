import { renderHook, waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  type Setters_Draft,
  type State_Draft_Local,
  type Status_Drag,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { useDraftEffects } from "./useDraftEffects";
import { describe, expect, it, mock } from "bun:test";

const createDraft = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  _id: "event-1",
  title: "Moved event",
  startDate: "2024-01-15T10:00:00.000Z",
  endDate: "2024-01-15T11:00:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "user-1",
  position: {
    isOverlapping: false,
    totalEventsInGroup: 1,
    widthMultiplier: 1,
    horizontalOrder: 1,
    dragOffset: { x: 0, y: 0 },
    initialX: null,
    initialY: null,
  },
  ...overrides,
});

const createState = (
  overrides: Partial<State_Draft_Local> = {},
): State_Draft_Local => ({
  dateBeingChanged: "endDate",
  draft: createDraft(),
  draftSessionKey: 0,
  dragStatus: { durationMin: 60, hasMoved: true },
  isDragging: true,
  isFormOpen: false,
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
  setDraftSessionKey: mock(),
  setDragStatus: mock(),
  setIsDragging: mock(),
  setIsFormOpen: mock(),
  setIsFormOpenBeforeDragging: mock(),
  setIsResizing: mock(),
  setResizeStatus: mock(),
  ...overrides,
});

const weekProps = {
  component: { week: "2024-01-15" },
  util: {
    getLastNavigationSource: () => "manual",
  },
} as unknown as WeekProps;

describe("useDraftEffects", () => {
  it("preserves movement tracking while refreshing drag duration", async () => {
    const setDragStatus = mock();
    const setters = createSetters({ setDragStatus });

    renderHook(() =>
      useDraftEffects(createState(), setters, weekProps, true, async () => {}),
    );

    await waitFor(() => expect(setDragStatus).toHaveBeenCalled());

    const updateDragStatus = setDragStatus.mock.calls.at(-1)?.[0];

    expect(typeof updateDragStatus).toBe("function");
    expect(
      (updateDragStatus as (status: Status_Drag) => Status_Drag)({
        durationMin: 60,
        hasMoved: true,
      }),
    ).toEqual({ durationMin: 60, hasMoved: true });
  });
});
