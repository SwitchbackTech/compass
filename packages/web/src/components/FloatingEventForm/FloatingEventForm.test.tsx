import { render, screen } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import { type CalendarEventFormController } from "@web/views/Forms/hooks/useCalendarEventForm";
import { describe, expect, it, mock } from "bun:test";

const floatingUi =
  require("@floating-ui/react") as typeof import("@floating-ui/react");

mock.module("@floating-ui/react", () => ({
  ...floatingUi,
  FloatingFocusManager: ({ children }: PropsWithChildren) => children,
  FloatingPortal: ({ children }: PropsWithChildren) => children,
}));

const { FloatingEventForm } =
  require("./FloatingEventForm") as typeof import("./FloatingEventForm");

const event: Schema_Event = {
  _id: "event-1",
  description: "",
  endDate: "2026-05-20T10:00:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  startDate: "2026-05-20T09:00:00.000Z",
  title: "Planning",
  user: "user-1",
};

const createController = (isOpen: boolean): CalendarEventFormController =>
  ({
    context: { floatingStyles: {} },
    getFloatingProps: () => ({}),
    isOpen,
    refs: { setFloating: mock() },
  }) as unknown as CalendarEventFormController;

const props = {
  event,
  isDraft: false,
  isExistingEvent: true,
  onClose: mock(),
  onDelete: mock(),
  onDuplicate: mock(),
  onSubmit: mock(),
  setEvent: mock(),
};

describe("FloatingEventForm", () => {
  it("renders supplied form props when its controller is open", () => {
    render(
      <FloatingEventForm controller={createController(true)} {...props} />,
    );

    expect(screen.getByRole("form")).toBeVisible();
  });

  it("does not render when its controller is closed", () => {
    render(
      <FloatingEventForm controller={createController(false)} {...props} />,
    );

    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
});
