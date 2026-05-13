import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { InteractionEngine } from "./InteractionEngine";
import { describe, expect, it, mock } from "bun:test";

const createDraft = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  _id: "event-1",
  title: "Seed event",
  startDate: "2024-01-15T10:00:00.000Z",
  endDate: "2024-01-15T11:30:00.000Z",
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

describe("InteractionEngine", () => {
  it("mirrors React draft drag state in shadow mode", () => {
    const engine = new InteractionEngine();
    const draft = createDraft();

    engine.mirrorDraftState({
      draft,
      isDragging: true,
      isResizing: false,
    });

    expect(engine.getSnapshot()).toMatchObject({
      mode: "drag",
      draft,
    });
  });

  it("clears live interaction state when React draft state is idle", () => {
    const engine = new InteractionEngine();

    engine.mirrorDraftState({
      draft: createDraft(),
      isDragging: false,
      isResizing: true,
    });
    engine.updatePointer({ x: 80, y: 120 });
    engine.mirrorDraftState({
      draft: null,
      isDragging: false,
      isResizing: false,
    });

    expect(engine.getSnapshot()).toMatchObject({
      mode: "idle",
      draft: null,
      pointer: null,
    });
  });

  it("can publish live draft motion without notifying React store subscribers", () => {
    const engine = new InteractionEngine();
    const reactSubscriber = mock();
    const motionSubscriber = mock();
    const draft = createDraft({ title: "Live draft" });

    engine.getStore().subscribe(reactSubscriber);
    engine.subscribeMotion(motionSubscriber);
    engine.updateDraft(draft, { notifyReact: false });

    expect(engine.getSnapshot().draft).toBe(draft);
    expect(reactSubscriber).not.toHaveBeenCalled();
    expect(motionSubscriber).toHaveBeenCalledWith(engine.getSnapshot());
  });
});
