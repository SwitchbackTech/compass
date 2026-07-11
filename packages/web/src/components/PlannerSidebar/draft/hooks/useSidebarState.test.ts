import { act } from "@testing-library/react";
import { renderHookWithStore } from "@web/__tests__/render-with-store";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { beforeEach, describe, expect, it } from "bun:test";

let isDNDing = false;

const { useSidebarState } =
  require("./useSidebarState") as typeof import("./useSidebarState");

const draftEvent = createMockEvent({
  content: { kind: "details", title: "Draft", description: "" },
});

const createSidebarState = () => {
  if (!isDNDing) {
    return createInitialState();
  }

  return createInitialState({
    events: {
      draft: {
        event: null,
        status: {
          activity: "dnd",
          dateToResize: null,
          eventType: null,
          isDrafting: true,
          isFormOpen: false,
        },
      },
    },
  });
};

const renderSidebarState = () =>
  renderHookWithStore(() => useSidebarState(), createSidebarState());

describe("useSidebarState", () => {
  beforeEach(() => {
    isDNDing = false;
  });

  it("tracks active dragging when a someday event draft is moving", () => {
    isDNDing = true;

    const { result } = renderSidebarState();

    act(() => {
      result.current.setters.setDraft(draftEvent);
    });

    expect(result.current.state.isDragging).toBe(true);
  });

  it("does not treat an open sidebar draft form as active dragging", () => {
    const { result } = renderSidebarState();

    act(() => {
      result.current.setters.setDraft(draftEvent);
      result.current.setters.setIsDrafting(true);
      result.current.setters.setIsSomedayFormOpen(true);
    });

    expect(result.current.state.isDragging).toBe(false);
  });
});
