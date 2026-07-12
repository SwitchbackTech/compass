import { renderHook, waitFor } from "@testing-library/react";
import { Priorities } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import {
  type Setters_Draft,
  type State_Draft_Local,
  type Status_Drag,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { useDraftEffects } from "./useDraftEffects";
import { describe, expect, it, mock } from "bun:test";

const sourceEvent: Event = {
  id: "0123456789abcdef01234567",
  calendarId: "0123456789abcdef76543210",
  content: { kind: "details", title: "Moved event", description: "" },
  schedule: {
    kind: "timed",
    start: "2024-01-15T10:00:00.000Z",
    end: "2024-01-15T11:00:00.000Z",
    timeZone: "UTC",
  },
  recurrence: { kind: "single" },
  priority: Priorities.UNASSIGNED,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: null,
} as unknown as Event;

const createDraft = (): GridEventDraft => {
  const draft = editGridEventDraft(sourceEvent);
  if (!draft) throw new Error("Expected an edit draft");
  return draft;
};

const createState = (
  overrides: Partial<State_Draft_Local> = {},
): State_Draft_Local => ({
  dateBeingChanged: "endDate",
  draft: createDraft(),
  draftSessionKey: 0,
  dragOffset: { x: 0, y: 0 },
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
