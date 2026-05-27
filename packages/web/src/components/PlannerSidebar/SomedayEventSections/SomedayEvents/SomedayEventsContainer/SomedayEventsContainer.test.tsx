import { render, screen } from "@testing-library/react";
import type React from "react";
import { Categories_Event } from "@core/types/event.types";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

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
  "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayDropTargetRegistry",
  () => ({
    useSomedayDropTargetRegistrationRef: () => () => undefined,
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
  PlusIcon: () => <span aria-hidden="true">plus</span>,
}));

mock.module("@web/store/store.hooks", () => ({
  useAppSelector: () => false,
}));

const { SomedayEventsContainer } =
  require("./SomedayEventsContainer") as typeof import("./SomedayEventsContainer");

describe("SomedayEventsContainer", () => {
  beforeEach(() => {
    mockCreateSomedayDraft.mockClear();
  });

  it("keeps the visible add label in the week button's accessible name", () => {
    render(
      <SomedayEventsContainer
        category={Categories_Event.SOMEDAY_WEEK}
        events={[]}
        isDraftingNew={false}
      />,
    );

    expect(screen.getByText("Add item")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add item to week" }),
    ).toBeTruthy();
  });

  it("keeps the visible add label in the month button's accessible name", () => {
    render(
      <SomedayEventsContainer
        category={Categories_Event.SOMEDAY_MONTH}
        events={[]}
        isDraftingNew={false}
      />,
    );

    expect(screen.getByText("Add item")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add item to month" }),
    ).toBeTruthy();
  });
});

afterAll(() => {
  mock.restore();
});
