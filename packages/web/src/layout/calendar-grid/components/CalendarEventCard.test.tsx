import { fireEvent, render, screen } from "@testing-library/react";
import { Priorities } from "@core/constants/core.constants";
import { gridColorByPriority } from "@web/common/styles/theme.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

import { CalendarAllDayEventCard } from "./CalendarAllDayEventCard";
import { CalendarTimedEventCard } from "./CalendarTimedEventCard";

const createEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent =>
  ({
    _id: "event-1",
    endDate: "2024-01-15T10:00:00.000Z",
    isAllDay: false,
    position: {
      dragOffset: { x: 0, y: 0 },
      horizontalOrder: 0,
      initialX: null,
      initialY: null,
      isOverlapping: false,
      totalEventsInGroup: 1,
      widthMultiplier: 1,
    },
    priority: Priorities.UNASSIGNED,
    recurrence: undefined,
    startDate: "2024-01-15T09:00:00.000Z",
    title: "Planning block",
    ...overrides,
  }) as Schema_GridEvent;

const position = {
  height: 60,
  left: 10,
  top: 20,
  width: 140,
};

describe("CalendarEventCard", () => {
  it("renders timed event details, interaction attributes, and resize handles", () => {
    const onEventMouseDown = mock();
    const onScalerMouseDown = mock();

    render(
      <CalendarTimedEventCard
        displayMode="saved"
        event={createEvent({
          startDate: "2099-01-15T09:00:00.000Z",
          endDate: "2099-01-15T10:00:00.000Z",
        })}
        interactionAttributes={{
          "data-week-interaction-event-id": "event-1",
          "data-week-interaction-event-type": "timed",
        }}
        motionMode="idle"
        onEventMouseDown={onEventMouseDown}
        onScalerMouseDown={onScalerMouseDown}
        position={position}
      />,
    );

    const card = screen.getByRole("button", {
      name: "Timed event: Planning block, 9 - 10 AM",
    });
    expect(card).not.toHaveAttribute("aria-disabled");
    expect(card).toHaveAttribute("data-event-id", "event-1");
    expect(card).toHaveAttribute("data-week-interaction-event-id", "event-1");
    expect(screen.getByText("Planning block")).toBeInTheDocument();

    const timeLabel = screen.getByText("9 - 10 AM");
    expect(timeLabel).toHaveAttribute("data-calendar-event-time-label", "true");

    const handles = document.querySelectorAll(
      "[data-calendar-event-resize-handle]",
    );
    expect(handles).toHaveLength(2);

    fireEvent.mouseDown(handles[0]);
    fireEvent.mouseDown(handles[1]);

    expect(onScalerMouseDown).toHaveBeenCalledTimes(2);
    expect(onScalerMouseDown.mock.calls[0]?.[2]).toBe("startDate");
    expect(onScalerMouseDown.mock.calls[1]?.[2]).toBe("endDate");

    fireEvent.mouseDown(card);
    expect(onEventMouseDown).toHaveBeenCalledTimes(1);
  });

  it("keeps the timed selected state on the priority color", () => {
    render(
      <CalendarTimedEventCard
        displayMode="saved"
        event={createEvent({
          priority: Priorities.WORK,
        })}
        isSelected={true}
        motionMode="idle"
        position={position}
      />,
    );

    const card = screen.getByRole("button", {
      name: "Timed event: Planning block, 9 - 10 AM",
    });

    expect(card).toHaveClass("bg-(--event-bg)");
    expect(card).not.toHaveClass("bg-event-selected");
    expect(card.style.getPropertyValue("--event-bg")).toBe(
      gridColorByPriority[Priorities.WORK],
    );
    expect(card.style.boxShadow).toContain("rgba(255,255,255,0.55)");
  });

  it("keeps timed event keyboard activation from reaching parent shortcuts", () => {
    const onEventKeyDown = mock();
    const onParentKeyDown = mock();

    render(
      // biome-ignore lint/a11y/noStaticElementInteractions: test wrapper simulates a parent shortcut listener.
      <div onKeyDown={onParentKeyDown}>
        <CalendarTimedEventCard
          displayMode="saved"
          event={createEvent()}
          motionMode="idle"
          onEventKeyDown={onEventKeyDown}
          position={position}
        />
      </div>,
    );

    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });

    expect(onEventKeyDown).toHaveBeenCalledTimes(1);
    expect(onParentKeyDown).not.toHaveBeenCalled();
  });

  it("announces recurring timed events", () => {
    render(
      <CalendarTimedEventCard
        displayMode="saved"
        event={createEvent({
          recurrence: {
            eventId: "series-1",
            rule: ["RRULE:FREQ=WEEKLY"],
          },
        })}
        motionMode="idle"
        position={position}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Recurring Timed event: Planning block, 9 - 10 AM",
      }),
    ).toBeInTheDocument();
  });

  it("places the repeat indicator bottom-right and colors it by priority", () => {
    const renderRecurring = (priority: Priorities) =>
      render(
        <CalendarTimedEventCard
          displayMode="saved"
          event={createEvent({
            priority,
            recurrence: { eventId: "series-1", rule: ["RRULE:FREQ=WEEKLY"] },
          })}
          motionMode="idle"
          position={position}
        />,
      );

    const { container: workContainer, unmount } = renderRecurring(
      Priorities.WORK,
    );
    const workIcon = workContainer.querySelector('svg[class*="right-1"]');

    // Positioned bottom-right (not the old bottom-left), and no longer the
    // hardcoded white fg color.
    expect(workIcon).not.toBeNull();
    const workClass = workIcon?.getAttribute("class") ?? "";
    expect(workClass).not.toContain("left-1");
    expect(workClass).not.toContain("fg-primary");
    const workMarkup = workIcon?.outerHTML;
    unmount();

    // A different priority yields a different (priority-derived) icon color.
    const { container: relationsContainer } = renderRecurring(
      Priorities.RELATIONS,
    );
    const relationsIcon = relationsContainer.querySelector(
      'svg[class*="right-1"]',
    );
    expect(relationsIcon?.outerHTML).not.toBe(workMarkup);
  });

  it("shows the repeat indicator on a 15-minute recurring event despite its small rendered height", () => {
    // A true 15-minute event lays out shorter than a taller one resized down to
    // 15 minutes; the icon used to be gated on rendered pixel height, so the two
    // disagreed. Gating on duration makes any 15-minute recurring event qualify.
    const { container } = render(
      <CalendarTimedEventCard
        displayMode="saved"
        event={createEvent({
          endDate: "2024-01-15T09:15:00.000Z",
          recurrence: { eventId: "series-1", rule: ["RRULE:FREQ=WEEKLY"] },
          startDate: "2024-01-15T09:00:00.000Z",
        })}
        motionMode="idle"
        // A short height that fell below the old pixel-height threshold.
        position={{ ...position, height: 18 }}
      />,
    );

    expect(container.querySelector('svg[class*="right-1"]')).not.toBeNull();
  });

  it("shows the repeat indicator on a recurring draft preview", () => {
    // The draft preview should reflect the future reality: once a draft has a
    // recurrence rule, its card renders the repeat icon immediately (drafts are
    // not placeholders, so they are not excluded from the indicator).
    const { container } = render(
      <CalendarTimedEventCard
        displayMode="draft"
        event={createEvent({
          _id: undefined,
          recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
        })}
        motionMode="idle"
        position={position}
      />,
    );

    expect(container.querySelector('svg[class*="right-1"]')).not.toBeNull();
  });

  it("hides the repeat indicator on a too-narrow event", () => {
    const { container } = render(
      <CalendarTimedEventCard
        displayMode="saved"
        event={createEvent({
          recurrence: { eventId: "series-1", rule: ["RRULE:FREQ=WEEKLY"] },
        })}
        motionMode="idle"
        // Below the width gate: too cramped to place the icon without crowding.
        position={{ ...position, width: 30 }}
      />,
    );

    expect(container.querySelector('svg[class*="right-1"]')).toBeNull();
  });

  it("renders all-day event details, interaction attributes, acknowledgement animation, and resize handles", () => {
    const onEventMouseDown = mock();
    const onScalerMouseDown = mock();

    render(
      <CalendarAllDayEventCard
        event={createEvent({
          isAllDay: true,
          title: "Conference",
        })}
        interactionAttributes={{
          "data-week-interaction-event-id": "event-2",
          "data-week-interaction-event-type": "all-day",
        }}
        isPlaceholder={false}
        onEventMouseDown={onEventMouseDown}
        onScalerMouseDown={onScalerMouseDown}
        position={position}
      />,
    );

    const card = screen.getByRole("button", {
      name: "All-day event: Conference",
    });
    expect(card).not.toHaveAttribute("aria-disabled");
    expect(card).toHaveAttribute("data-event-id", "event-1");
    expect(card).toHaveAttribute("data-week-interaction-event-type", "all-day");
    expect(screen.getByText("Conference")).toBeInTheDocument();

    const handles = document.querySelectorAll(
      "[data-calendar-event-resize-handle]",
    );
    expect(handles[0]).toHaveAttribute(
      "data-calendar-event-resize-handle",
      "startDate",
    );
    expect(handles[1]).toHaveAttribute(
      "data-calendar-event-resize-handle",
      "endDate",
    );

    fireEvent.mouseDown(handles[0]);
    fireEvent.mouseDown(handles[1]);
    fireEvent.mouseDown(card);

    expect(onScalerMouseDown).toHaveBeenCalledTimes(2);
    expect(onEventMouseDown).toHaveBeenCalledTimes(1);
  });

  it("keeps all-day event keyboard activation from reaching parent shortcuts", () => {
    const onEventKeyDown = mock();
    const onParentKeyDown = mock();

    render(
      // biome-ignore lint/a11y/noStaticElementInteractions: test wrapper simulates a parent shortcut listener.
      <div onKeyDown={onParentKeyDown}>
        <CalendarAllDayEventCard
          event={createEvent({
            isAllDay: true,
            title: "Conference",
          })}
          isPlaceholder={false}
          onEventKeyDown={onEventKeyDown}
          position={position}
        />
      </div>,
    );

    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });

    expect(onEventKeyDown).toHaveBeenCalledTimes(1);
    expect(onParentKeyDown).not.toHaveBeenCalled();
  });

  it("places the all-day repeat indicator bottom-right and colors it by priority", () => {
    const renderRecurring = (priority: Priorities) =>
      render(
        <CalendarAllDayEventCard
          event={createEvent({
            isAllDay: true,
            priority,
            recurrence: { eventId: "series-1", rule: ["RRULE:FREQ=WEEKLY"] },
          })}
          isPlaceholder={false}
          position={position}
        />,
      );

    const { container: workContainer, unmount } = renderRecurring(
      Priorities.WORK,
    );
    const workIcon = workContainer.querySelector('svg[class*="right-1"]');

    // Matches the timed card: bottom-right, and no longer the fixed white fg
    // color on the left.
    expect(workIcon).not.toBeNull();
    const workClass = workIcon?.getAttribute("class") ?? "";
    expect(workClass).toContain("bottom-0.5");
    expect(workClass).not.toContain("fg-primary");
    const workMarkup = workIcon?.outerHTML;
    unmount();

    // A different priority yields a different (priority-derived) icon color.
    const { container: relationsContainer } = renderRecurring(
      Priorities.RELATIONS,
    );
    const relationsIcon = relationsContainer.querySelector(
      'svg[class*="right-1"]',
    );
    expect(relationsIcon?.outerHTML).not.toBe(workMarkup);
  });

  it("announces recurring all-day events", () => {
    render(
      <CalendarAllDayEventCard
        event={createEvent({
          isAllDay: true,
          recurrence: {
            eventId: "series-1",
            rule: ["RRULE:FREQ=WEEKLY"],
          },
        })}
        isPlaceholder={false}
        position={position}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Recurring All-day event: Planning block",
      }),
    ).toBeInTheDocument();
  });
});
