import { configureStore } from "@reduxjs/toolkit";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { Provider as ReduxProvider } from "react-redux";
import { Categories_Event } from "@core/types/event.types";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { reducers } from "@web/store/reducers";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockCreateSomedayDraft = mock();

function Provider(props: React.ComponentProps<typeof ReduxProvider>) {
  return (
    <QueryClientProvider client={createCompassQueryClient()}>
      <ReduxProvider {...props} />
    </QueryClientProvider>
  );
}

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
