import React from "react";
import { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import "@testing-library/jest-dom";
import { LEARN_CHINESE } from "@core/__mocks__/v1/events/events.misc";
import { fireEvent, render } from "@web/__tests__/__mocks__/mock.render";
import { Categories_Event } from "@web/common/types/web.event.types";
import { SidebarDraftContext } from "@web/views/Calendar/components/Draft/sidebar/context/SidebarDraftContext";
import { SomedayEventContainer } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventContainer/SomedayEventContainer";

jest.mock(
  "@web/views/Calendar/components/Draft/hooks/state/useDraftForm",
  () => ({
    useDraftForm: () => ({
      context: {},
      refs: { setFloating: jest.fn(), setReference: jest.fn() },
      strategy: "absolute",
      x: 0,
      y: 0,
      getReferenceProps: () => ({}),
      getFloatingProps: () => ({}),
    }),
  }),
);

describe("SomedayEventContainer keyboard interactions", () => {
  it("opens the form when Enter is pressed", async () => {
    const onDraft = jest.fn();
    const contextValue = {
      state: {
        draft: null,
        isDrafting: false,
        isOverGrid: false,
        isSomedayFormOpen: false,
      } as any,
      setters: {
        setIsSomedayFormOpen: jest.fn(),
      } as any,
      actions: {
        onDraft,
        onMigrate: jest.fn(),
        discard: jest.fn(),
        reset: jest.fn(),
        closeForm: jest.fn(),
        close: jest.fn(),
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
          deleteEvent={jest.fn()}
          duplicateEvent={jest.fn()}
          onSubmit={jest.fn()}
          provided={
            {
              draggableProps: {
                "data-rfd-draggable-context-id": "mock-context",
                "data-rfd-draggable-id": "mock-id",
                style: {},
              },
              dragHandleProps: null,
              innerRef: jest.fn(),
            } as DraggableProvided
          }
          snapshot={{ isDragging: false } as DraggableStateSnapshot}
          setEvent={jest.fn()}
          weekViewRange={{ startDate: "2020-01-01", endDate: "2020-01-07" }}
        />
      </SidebarDraftContext.Provider>,
    );

    const btn = document.querySelector(
      `[data-event-id="${LEARN_CHINESE._id}"]`,
    )! as HTMLElement;
    btn.focus();
    fireEvent.keyDown(btn, { key: "Enter" });

    expect(onDraft).toHaveBeenCalledTimes(1);
    expect(onDraft).toHaveBeenCalledWith(
      LEARN_CHINESE,
      Categories_Event.SOMEDAY_WEEK,
    );
  });

  it("migrates event to Someday Week when Meta+Ctrl+ArrowUp is pressed", async () => {
    const onSubmit = jest.fn();
    const contextValue = {
      state: {
        draft: null,
        isDrafting: false,
        isOverGrid: false,
        isSomedayFormOpen: false,
      } as any,
      setters: {
        setIsSomedayFormOpen: jest.fn(),
      } as any,
      actions: {
        onDraft: jest.fn(),
        onMigrate: jest.fn(),
        discard: jest.fn(),
        reset: jest.fn(),
        closeForm: jest.fn(),
        close: jest.fn(),
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
          deleteEvent={jest.fn()}
          duplicateEvent={jest.fn()}
          onSubmit={onSubmit}
          provided={
            {
              draggableProps: {
                "data-rfd-draggable-context-id": "mock-context",
                "data-rfd-draggable-id": "mock-id",
                style: {},
              },
              dragHandleProps: null,
              innerRef: jest.fn(),
            } as DraggableProvided
          }
          snapshot={{ isDragging: false } as DraggableStateSnapshot}
          setEvent={jest.fn()}
          weekViewRange={weekViewRange}
        />
      </SidebarDraftContext.Provider>,
    );

    const btn = document.querySelector(
      `[data-event-id="${LEARN_CHINESE._id}"]`,
    )! as HTMLElement;
    btn.focus();
    fireEvent.keyDown(btn, { key: "ArrowUp", metaKey: true, ctrlKey: true });

    expect(onSubmit).toHaveBeenCalledTimes(1);

    // TODO: Do a date validation
  });

  it("migrates event to Someday Month when Meta+Ctrl+ArrowDown is pressed", async () => {
    const onSubmit = jest.fn();
    const contextValue = {
      state: {
        draft: null,
        isDrafting: false,
        isOverGrid: false,
        isSomedayFormOpen: false,
      } as any,
      setters: {
        setIsSomedayFormOpen: jest.fn(),
      } as any,
      actions: {
        onDraft: jest.fn(),
        onMigrate: jest.fn(),
        discard: jest.fn(),
        reset: jest.fn(),
        closeForm: jest.fn(),
        close: jest.fn(),
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
          deleteEvent={jest.fn()}
          duplicateEvent={jest.fn()}
          onSubmit={onSubmit}
          provided={
            {
              draggableProps: {
                "data-rfd-draggable-context-id": "mock-context",
                "data-rfd-draggable-id": "mock-id",
                style: {},
              },
              dragHandleProps: null,
              innerRef: jest.fn(),
            } as DraggableProvided
          }
          snapshot={{ isDragging: false } as DraggableStateSnapshot}
          setEvent={jest.fn()}
          weekViewRange={weekViewRange}
        />
      </SidebarDraftContext.Provider>,
    );

    const btn = document.querySelector(
      `[data-event-id="${LEARN_CHINESE._id}"]`,
    )! as HTMLElement;
    btn.focus();
    fireEvent.keyDown(btn, { key: "ArrowDown", metaKey: true, ctrlKey: true });

    expect(onSubmit).toHaveBeenCalledTimes(1);

    // TODO: Do a date validation
  });
});
