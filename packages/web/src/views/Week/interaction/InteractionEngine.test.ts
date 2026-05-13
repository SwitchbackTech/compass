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
  it("preserves drag mode while mirroring React draft state", () => {
    const engine = new InteractionEngine();
    const draft = createDraft();

    engine.startDrag(draft);
    engine.mirrorDraftState({
      draft,
      isResizing: false,
    });

    expect(engine.getSnapshot()).toMatchObject({
      mode: "drag",
      draft,
      drag: {
        durationMin: 90,
        hasMoved: false,
      },
    });
  });

  it("ignores stale null draft mirrors while an interaction is active", () => {
    const engine = new InteractionEngine();
    const draft = createDraft();

    engine.startResize(draft);
    engine.updatePointer({ x: 80, y: 120 });
    engine.mirrorDraftState({
      draft: null,
      isResizing: false,
    });

    expect(engine.getSnapshot()).toMatchObject({
      mode: "resize",
      draft,
      pointer: { x: 80, y: 120 },
    });
  });

  it("clears live interaction state when explicitly reset", () => {
    const engine = new InteractionEngine();

    engine.startResize(createDraft());
    engine.updatePointer({ x: 80, y: 120 });
    engine.reset();

    expect(engine.getSnapshot()).toMatchObject({
      draft: null,
      mode: "idle",
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
