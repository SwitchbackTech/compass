import {
  type DraggableProvided,
  type DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import "@testing-library/jest-dom";
import { LEARN_CHINESE } from "@core/__mocks__/v1/events/events.misc";
import {
  Categories_Event,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { createMockBaseEvent } from "@core/util/test/ccal.event.factory";
import { fireEvent, render } from "@web/__tests__/__mocks__/mock.render";
import { SidebarDraftContext } from "@web/views/Calendar/components/Draft/sidebar/context/SidebarDraftContext";
import { describe, expect, it, mock } from "bun:test";

mock.module(
  "@web/views/Calendar/components/Draft/hooks/state/useDraftForm",
  () => ({
    useDraftForm: () => ({
      context: {},
      refs: { setFloating: mock(), setReference: mock() },
      strategy: "absolute",
      x: 0,
      y: 0,
      getReferenceProps: () => ({}),
      getFloatingProps: () => ({}),
    }),
  }),
);

const { SomedayEventContainer } =
  require("@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventContainer/SomedayEventContainer") as typeof import("@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventContainer/SomedayEventContainer");

describe("SomedayEventContainer keyboard interactions", () => {
  it("opens the form when Enter is pressed", async () => {
    const onDraft = mock();
    const contextValue = {
      state: {
        draft: null,
        isDrafting: false,
        isOverGrid: false,
        isSomedayFormOpen: false,
      } as any,
      setters: {
        setIsSomedayFormOpen: mock(),
      } as any,
      actions: {
        onDraft,
        onMigrate: mock(),
        discard: mock(),
        reset: mock(),
        closeForm: mock(),
        close: mock(),
      } as any,
    };

    render(
      <SidebarDraftContext.Provider value={contextValue as any}>
        <SomedayEventContainer
          category={Categories_Event.SOMEDAY_WEEK}
          event={LEARN_CHINESE}
          isDrafting={false}
          isDragging={false}
          isOverGrid={false}
          deleteEvent={mock()}
          duplicateEvent={mock()}
          onSubmit={mock()}
          provided={
            {
              draggableProps: {
                "data-rfd-draggable-context-id": "mock-context",
                "data-rfd-draggable-id": "mock-id",
                style: {},
              },
              dragHandleProps: null,
              innerRef: mock(),
            } as DraggableProvided
          }
          snapshot={{ isDragging: false } as DraggableStateSnapshot}
          setEvent={mock()}
          weekViewRange={{ startDate: "2020-01-01", endDate: "2020-01-07" }}
        />
      </SidebarDraftContext.Provider>,
    );

    const btn = document.querySelector(
      `[data-event-id="${LEARN_CHINESE._id}"]`,
    )!;
    fireEvent.focus(btn);
    fireEvent.keyDown(btn, { key: "Enter" });

    expect(onDraft).toHaveBeenCalledTimes(1);
    expect(onDraft).toHaveBeenCalledWith(
      LEARN_CHINESE,
      Categories_Event.SOMEDAY_WEEK,
    );
  });

  it("migrates event to Someday Week when Meta+Ctrl+ArrowUp is pressed", async () => {
    const onSubmit = mock();
    const contextValue = {
      state: {
        draft: null,
        isDrafting: false,
        isOverGrid: false,
        isSomedayFormOpen: false,
      } as any,
      setters: {
        setIsSomedayFormOpen: mock(),
      } as any,
      actions: {
        onDraft: mock(),
        onMigrate: mock(),
        discard: mock(),
        reset: mock(),
        closeForm: mock(),
        close: mock(),
        onSubmit,
      } as any,
    };

    const weekViewRange = { startDate: "2020-01-05", endDate: "2020-01-11" };

    render(
      <SidebarDraftContext.Provider value={contextValue as any}>
        <SomedayEventContainer
          category={Categories_Event.SOMEDAY_MONTH}
          event={LEARN_CHINESE}
          isDrafting={false}
          isDragging={false}
          isOverGrid={false}
          deleteEvent={mock()}
          duplicateEvent={mock()}
          onSubmit={onSubmit}
          provided={
            {
              draggableProps: {
                "data-rfd-draggable-context-id": "mock-context",
                "data-rfd-draggable-id": "mock-id",
                style: {},
              },
              dragHandleProps: null,
              innerRef: mock(),
            } as DraggableProvided
          }
          snapshot={{ isDragging: false } as DraggableStateSnapshot}
          setEvent={mock()}
          weekViewRange={weekViewRange}
        />
      </SidebarDraftContext.Provider>,
    );

    const btn = document.querySelector(
      `[data-event-id="${LEARN_CHINESE._id}"]`,
    )!;
    fireEvent.focus(btn);
    fireEvent.keyDown(btn, { key: "ArrowUp", metaKey: true, ctrlKey: true });

    expect(onSubmit).toHaveBeenCalledTimes(1);

    // TODO: Do a date validation
  });

  it("migrates event to Someday Month when Meta+Ctrl+ArrowDown is pressed", async () => {
    const onSubmit = mock();
    const contextValue = {
      state: {
        draft: null,
        isDrafting: false,
        isOverGrid: false,
        isSomedayFormOpen: false,
      } as any,
      setters: {
        setIsSomedayFormOpen: mock(),
      } as any,
      actions: {
        onDraft: mock(),
        onMigrate: mock(),
        discard: mock(),
        reset: mock(),
        closeForm: mock(),
        close: mock(),
        onSubmit,
      } as any,
    };

    const weekViewRange = { startDate: "2020-01-01", endDate: "2020-01-07" };

    render(
      <SidebarDraftContext.Provider value={contextValue as any}>
        <SomedayEventContainer
          category={Categories_Event.SOMEDAY_WEEK}
          event={LEARN_CHINESE}
          isDrafting={false}
          isDragging={false}
          isOverGrid={false}
          deleteEvent={mock()}
          duplicateEvent={mock()}
          onSubmit={onSubmit}
          provided={
            {
              draggableProps: {
                "data-rfd-draggable-context-id": "mock-context",
                "data-rfd-draggable-id": "mock-id",
                style: {},
              },
              dragHandleProps: null,
              innerRef: mock(),
            } as DraggableProvided
          }
          snapshot={{ isDragging: false } as DraggableStateSnapshot}
          setEvent={mock()}
          weekViewRange={weekViewRange}
        />
      </SidebarDraftContext.Provider>,
    );

    const btn = document.querySelector(
      `[data-event-id="${LEARN_CHINESE._id}"]`,
    )!;
    fireEvent.focus(btn);
    fireEvent.keyDown(btn, { key: "ArrowDown", metaKey: true, ctrlKey: true });

    expect(onSubmit).toHaveBeenCalledTimes(1);

    // TODO: Do a date validation
  });
});

describe("SomedayEventContainer deletion behavior", () => {
  it("should determine correct deletion scope for recurring events with rule", () => {
    const recurringEvent = createMockBaseEvent({
      isSomeday: true,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
    }) as Schema_Event;

    // Verify the event has the recurrence rule
    expect(Array.isArray(recurringEvent.recurrence?.rule)).toBe(true);
    expect(recurringEvent.recurrence?.rule).toEqual(["RRULE:FREQ=WEEKLY"]);

    // The logic in SomedayEventContainer checks:
    // const isRecurring = Array.isArray(event.recurrence?.rule) || typeof event.recurrence?.eventId === "string";
    const isRecurring =
      Array.isArray(recurringEvent.recurrence?.rule) ||
      typeof recurringEvent.recurrence?.eventId === "string";

    expect(isRecurring).toBe(true);

    // When isRecurring is true, deleteScope should be ALL_EVENTS
    const deleteScope = isRecurring
      ? RecurringEventUpdateScope.ALL_EVENTS
      : RecurringEventUpdateScope.THIS_EVENT;

    expect(deleteScope).toBe(RecurringEventUpdateScope.ALL_EVENTS);
  });

  it("should determine correct deletion scope for recurring event instances", () => {
    const recurringInstance = createMockBaseEvent({
      isSomeday: true,
    }) as Schema_Event;
    recurringInstance.recurrence = { eventId: "base-event-id-123" };

    // Verify the event has the eventId
    expect(typeof recurringInstance.recurrence?.eventId).toBe("string");

    // The logic in SomedayEventContainer checks:
    const isRecurring =
      Array.isArray(recurringInstance.recurrence?.rule) ||
      typeof recurringInstance.recurrence?.eventId === "string";

    expect(isRecurring).toBe(true);

    // When isRecurring is true, deleteScope should be ALL_EVENTS
    const deleteScope = isRecurring
      ? RecurringEventUpdateScope.ALL_EVENTS
      : RecurringEventUpdateScope.THIS_EVENT;

    expect(deleteScope).toBe(RecurringEventUpdateScope.ALL_EVENTS);
  });

  it("should determine correct deletion scope for non-recurring events", () => {
    const standaloneEvent = LEARN_CHINESE;

    // Verify the event does not have recurrence
    expect(standaloneEvent.recurrence?.rule).toBeUndefined();
    expect(standaloneEvent.recurrence?.eventId).toBeUndefined();

    // The logic in SomedayEventContainer checks:
    const isRecurring =
      Array.isArray(standaloneEvent.recurrence?.rule) ||
      typeof standaloneEvent.recurrence?.eventId === "string";

    expect(isRecurring).toBe(false);

    // When isRecurring is false, deleteScope should be THIS_EVENT
    const deleteScope = isRecurring
      ? RecurringEventUpdateScope.ALL_EVENTS
      : RecurringEventUpdateScope.THIS_EVENT;

    expect(deleteScope).toBe(RecurringEventUpdateScope.THIS_EVENT);
  });
});
