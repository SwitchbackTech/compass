import { act } from "react";
import { addEntities } from "@ngneat/elf-entities";
import { renderHook } from "@testing-library/react";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import {
  DATA_EVENT_ELEMENT_ID,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  CursorItem,
  closeFloatingAtCursor,
  nodeId$,
  open$,
  reference$,
} from "@web/common/hooks/useOpenAtCursor";
import { eventsStore, getDraft } from "@web/store/events";
import { useDuplicateEvent } from "./useDuplicateEvent";

describe("useDuplicateEvent Integration", () => {
  const mockEventId = "event-123";
  const mockEvent = {
    _id: mockEventId,
    title: "Test Event",
    startDate: "2023-01-01",
    endDate: "2023-01-01",
    isAllDay: false,
    priority: "high",
  } as unknown as WithCompassId<Schema_Event>;

  beforeEach(() => {
    jest.useFakeTimers();
    eventsStore.reset();
    closeFloatingAtCursor();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should duplicate event and open form when event and element exist", async () => {
    // Setup Store
    eventsStore.update(addEntities(mockEvent));

    // Setup DOM (Grid container)
    const gridMain = document.createElement("div");
    gridMain.id = ID_GRID_MAIN;
    document.body.appendChild(gridMain);

    const { result } = renderHook(() => useDuplicateEvent(mockEventId));

    await act(async () => {
      result.current();
    });

    // Advance timer for lastValueFrom(timer(10))
    await act(async () => {
      jest.advanceTimersByTime(10);
      // Allow promise resolution (then block)
      await Promise.resolve();
    });

    // Now draft should be set. Get the new ID.
    const draft = eventsStore.query(getDraft);
    expect(draft).not.toBeNull();
    const newId = draft!._id;
    expect(newId).not.toBe(mockEventId);

    // Simulate Grid rendering the new event
    const newEventElement = document.createElement("div");
    newEventElement.setAttribute(DATA_EVENT_ELEMENT_ID, newId);
    gridMain.appendChild(newEventElement);

    // Allow queueMicrotask to run
    await act(async () => {
      await Promise.resolve();
    });

    // Advance timer for second timer(10)
    await act(async () => {
      jest.advanceTimersByTime(10);
      await Promise.resolve();
    });

    // Advance timer for openFloatingAtCursor (setTimeout 10ms)
    await act(async () => {
      jest.advanceTimersByTime(10);
      await Promise.resolve();
    });

    // Assert Floating State
    expect(open$.getValue()).toBe(true);
    expect(nodeId$.getValue()).toBe(CursorItem.EventForm);
    expect(reference$.getValue()).toBe(newEventElement);
  });

  it("should not open form if element is missing", async () => {
    // Setup Store
    eventsStore.update(addEntities(mockEvent));

    // Setup DOM (without the event element)
    const gridMain = document.createElement("div");
    gridMain.id = ID_GRID_MAIN;
    document.body.appendChild(gridMain);

    const { result } = renderHook(() => useDuplicateEvent(mockEventId));

    await act(async () => {
      result.current();
    });

    // Advance timer for lastValueFrom(timer(10))
    await act(async () => {
      jest.advanceTimersByTime(10);
      await Promise.resolve();
    });

    // Assert Draft (should still be created)
    const draft = eventsStore.query(getDraft);
    expect(draft).not.toBeNull();
    expect(draft?._id).not.toBe(mockEventId);

    // Allow queueMicrotask to run
    await act(async () => {
      await Promise.resolve();
    });

    // Advance timer for openFloatingAtCursor (setTimeout 10ms)
    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    // Assert Floating State (should NOT be open)
    expect(open$.getValue()).toBe(false);
    expect(nodeId$.getValue()).toBeNull();
  });

  it("should do nothing if event does not exist", async () => {
    // Store is empty

    const { result } = renderHook(() => useDuplicateEvent(mockEventId));

    await act(async () => {
      result.current();
    });

    // Advance timer
    await act(async () => {
      jest.advanceTimersByTime(10);
      await Promise.resolve();
    });

    // Assert Draft
    const draft = eventsStore.query(getDraft);
    expect(draft).toBeNull();

    // Assert Floating State
    expect(open$.getValue()).toBe(false);
  });
});
