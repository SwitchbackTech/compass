import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { Provider } from "react-redux";
import { Categories_Event } from "@core/types/event.types";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { reducers } from "@web/store/reducers";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockCreateSomedayDraft = mock();

const defaultSidebarState = () => ({
  blockedSomedayDropColumn: null as string | null,
  draft: null,
  isCalendarDragActive: false,
  isDragging: false,
  isDraftingNew: false,
  isSomedayFormOpen: false,
  somedayEvents: {
    columns: {
      weekEvents: { eventIds: [] },
      monthEvents: { eventIds: [] },
    },
    events: {},
  },
});

let sidebarState = defaultSidebarState();

mock.module(
  "@web/components/PlannerSidebar/draft/context/useSidebarContext",
  () => ({
    useSidebarContext: () => ({
      actions: {
        createSomedayDraft: mockCreateSomedayDraft,
      },
      state: sidebarState,
    }),
  }),
);

mock.module(
  "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventItem/SomedayEventItem",
  () => ({
    SomedayEventItem: () => <div>Someday event</div>,
  }),
);

const { SomedayEventsContainer } =
  require("./SomedayEventsContainer") as typeof import("./SomedayEventsContainer");

const renderSomedayEventsContainer = (
  props: React.ComponentProps<typeof SomedayEventsContainer>,
) => {
  const store = configureStore({
    preloadedState: createInitialState(),
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
        thunk: false,
      }),
  });

  return render(
    <Provider store={store}>
      <SomedayEventsContainer {...props} />
    </Provider>,
  );
};

describe("SomedayEventsContainer", () => {
  beforeEach(() => {
    mockCreateSomedayDraft.mockClear();
    sidebarState = defaultSidebarState();
  });

  it("keeps the visible add label in the week button's accessible name", () => {
    renderSomedayEventsContainer({
      category: Categories_Event.SOMEDAY_WEEK,
      events: [],
      isDraftingNew: false,
    });

    expect(screen.getByText("Add item")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add item to week" }),
    ).toBeTruthy();
  });

  it("keeps the visible add label in the month button's accessible name", () => {
    renderSomedayEventsContainer({
      category: Categories_Event.SOMEDAY_MONTH,
      events: [],
      isDraftingNew: false,
    });

    expect(screen.getByText("Add item")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add item to month" }),
    ).toBeTruthy();
  });

  it("hides the add button while a calendar event is dragged over the sidebar", () => {
    sidebarState = { ...defaultSidebarState(), isCalendarDragActive: true };

    renderSomedayEventsContainer({
      category: Categories_Event.SOMEDAY_WEEK,
      events: [],
      isDraftingNew: false,
    });

    expect(
      screen.queryByRole("button", { name: "Add item to week" }),
    ).toBeNull();
  });

  it("marks the drop zone invalid when its column is the blocked target", () => {
    sidebarState = {
      ...defaultSidebarState(),
      blockedSomedayDropColumn: "weekEvents",
      isCalendarDragActive: true,
    };

    const { container } = renderSomedayEventsContainer({
      category: Categories_Event.SOMEDAY_WEEK,
      events: [],
      isDraftingNew: false,
    });

    expect(container.querySelector('[aria-invalid="true"]')).not.toBeNull();
  });

  it("does not mark the drop zone invalid when another column is blocked", () => {
    sidebarState = {
      ...defaultSidebarState(),
      blockedSomedayDropColumn: "monthEvents",
      isCalendarDragActive: true,
    };

    const { container } = renderSomedayEventsContainer({
      category: Categories_Event.SOMEDAY_WEEK,
      events: [],
      isDraftingNew: false,
    });

    expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
  });
});
