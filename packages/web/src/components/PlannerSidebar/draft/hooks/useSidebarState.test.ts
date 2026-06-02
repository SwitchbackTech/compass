import { act } from "@testing-library/react";
import { type Schema_Event } from "@core/types/event.types";
import { renderHookWithStore } from "@web/__tests__/render-with-store";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { beforeEach, describe, expect, it } from "bun:test";

let isDNDing = false;

const { useSidebarState } =
  require("./useSidebarState") as typeof import("./useSidebarState");

const draftEvent = {
  _id: "draft-event-id",
  title: "Draft",
} as Schema_Event;

const createSidebarState = () => {
  const state = createInitialState();

  if (isDNDing) {
    state.events.draft!.status = {
      activity: "dnd",
      dateToResize: null,
      eventType: null,
      isDrafting: true,
    };
  }

  return state;
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
