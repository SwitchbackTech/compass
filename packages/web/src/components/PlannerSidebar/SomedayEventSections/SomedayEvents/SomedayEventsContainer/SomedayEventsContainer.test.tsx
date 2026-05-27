import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { Provider } from "react-redux";
import { Categories_Event } from "@core/types/event.types";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { reducers } from "@web/store/reducers";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockCreateSomedayDraft = mock();

mock.module("@web/components/DND/DropZone", () => ({
  DropZone: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

mock.module(
  "@web/components/PlannerSidebar/draft/context/useSidebarContext",
  () => ({
    useSidebarContext: () => ({
      actions: {
        createSomedayDraft: mockCreateSomedayDraft,
      },
      state: {
        blockedSomedayDropColumn: null,
        draft: null,
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
      },
    }),
  }),
);

mock.module(
  "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventItem/SomedayEventItem",
  () => ({
    SomedayEventItem: () => <div>Someday event</div>,
  }),
);

mock.module("@web/components/Tooltip/TooltipWrapper", () => ({
  TooltipWrapper: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

mock.module("@phosphor-icons/react", () => ({
  ArrowCounterClockwise: () => <span aria-hidden="true">recurring</span>,
  CaretLeft: () => <span aria-hidden="true">left</span>,
  CaretRight: () => <span aria-hidden="true">right</span>,
  DotsSixVertical: () => <span aria-hidden="true">drag</span>,
  PlusIcon: () => <span aria-hidden="true">plus</span>,
}));

const { SomedayEventsContainer } =
  require("./SomedayEventsContainer") as typeof import("./SomedayEventsContainer");

mock.restore();

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
});
