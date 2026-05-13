import { renderHook, waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  type Setters_Draft,
  type State_Draft_Local,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { InteractionEngine } from "@web/views/Week/interaction/InteractionEngine";
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
  isFormOpen: false,
  isFormOpenBeforeDragging: null,
  isResizing: false,
  ...overrides,
});

const createSetters = (
  overrides: Partial<Setters_Draft> = {},
): Setters_Draft => ({
  setDateBeingChanged: mock(),
  setDraft: mock(),
  setIsFormOpen: mock(),
  setIsFormOpenBeforeDragging: mock(),
  setIsResizing: mock(),
  ...overrides,
});

const weekProps = {
  component: { week: "2024-01-15" },
  util: {
    getLastNavigationSource: () => "manual",
  },
} as unknown as WeekProps;

describe("useDraftEffects", () => {
  it("does not close the form for stale React resize state after engine resize has stopped", async () => {
    const interaction = new InteractionEngine();
    const setDateBeingChanged = mock();
    const setIsFormOpen = mock();

    renderHook(() =>
      useDraftEffects(
        createState({ isResizing: true }),
        createSetters({ setDateBeingChanged, setIsFormOpen }),
        weekProps,
        true,
        async () => {},
        interaction,
      ),
    );

    await Promise.resolve();

    expect(setDateBeingChanged).not.toHaveBeenCalled();
    expect(setIsFormOpen).not.toHaveBeenCalledWith(false);
  });

  it("clears stale draft state from React and the interaction engine", async () => {
    const draft = createDraft();
    const interaction = new InteractionEngine();
    const setDateBeingChanged = mock();
    const setDraft = mock();
    const setIsFormOpen = mock();
    const setIsResizing = mock();

    interaction.startDrag(draft);

    renderHook(() =>
      useDraftEffects(
        createState({ draft }),
        createSetters({
          setDateBeingChanged,
          setDraft,
          setIsFormOpen,
          setIsResizing,
        }),
        weekProps,
        false,
        async () => {},
        interaction,
      ),
    );

    await waitFor(() => expect(setDraft).toHaveBeenCalledWith(null));
    expect(interaction.getSnapshot()).toMatchObject({
      draft: null,
      mode: "idle",
    });
    expect(setIsFormOpen).toHaveBeenCalledWith(false);
    expect(setIsResizing).toHaveBeenCalledWith(false);
    expect(setDateBeingChanged).toHaveBeenCalledWith(null);
  });
});
