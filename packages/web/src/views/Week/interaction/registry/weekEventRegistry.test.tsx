import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { FloatingInteractionOverlay } from "@web/common/calendar-interaction/dom/overlay/FloatingInteractionOverlay";
import { gridHoverColorByPriority } from "@web/common/styles/theme.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  __resetSomedayCommitAcknowledgementState,
  markSomedayCommitAcknowledgement,
} from "@web/components/PlannerSidebar/SomedayEventSections/interaction/state/somedayCommitAcknowledgementState";
import { reducers } from "@web/store/reducers";
import { GridEvent } from "@web/views/Week/components/Event/Grid/GridEvent/GridEvent";
import { AllDayEventMemo } from "@web/views/Week/components/Grid/AllDayRow/AllDayEvent";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  GRID_EVENT_TIME_LABEL_FONT_SIZE,
  GRID_EVENT_TIME_LABEL_OPACITY,
  GRID_EVENT_TITLE_LINE_HEIGHT,
} from "@web/views/Week/layout.constants";
import { createWeekInteractionEventOverlayMount } from "../adapter/dom/cloneWeekInteractionEventElement";
import {
  createWeekEventRegistry,
  getWeekInteractionTargetAttributes,
  useWeekEventRegistrationRef,
  WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
  WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE,
  type WeekEventRegistry,
  type WeekInteractionEventType,
  weekEventRegistry,
} from "./weekEventRegistry";
import { afterEach, describe, expect, it, mock } from "bun:test";

const startOfView = dayjs("2026-05-17T00:00:00.000Z");
const endOfView = startOfView.add(7, "day");
const measurements = {
  allDayRow: null,
  colWidths: Array(7).fill(100),
  hourHeight: 70,
  mainGrid: {
    bottom: 770,
    height: 770,
    left: 0,
    right: 700,
    top: 0,
    width: 700,
    x: 0,
    y: 0,
  },
} satisfies Measurements_Grid;
const weekProps = {
  component: {
    endOfView,
    startOfView,
  },
} as WeekProps;

const position = {
  dragOffset: { x: 0, y: 0 },
  horizontalOrder: 1,
  initialX: null,
  initialY: null,
  isOverlapping: false,
  totalEventsInGroup: 1,
  widthMultiplier: 1,
};

const createTimedEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent =>
  ({
    _id: "timed-event",
    endDate: "2026-05-18T10:00:00.000Z",
    isAllDay: false,
    position,
    recurrence: undefined,
    startDate: "2026-05-18T09:00:00.000Z",
    title: "Timed event",
    ...overrides,
  }) as Schema_GridEvent;

const createAllDayEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent =>
  ({
    _id: "all-day-event",
    endDate: "2026-05-19T00:00:00.000Z",
    isAllDay: true,
    position,
    recurrence: undefined,
    row: 1,
    startDate: "2026-05-18T00:00:00.000Z",
    title: "All-day event",
    ...overrides,
  }) as Schema_GridEvent;

const createStore = (pendingEventIds: string[] = []) => {
  const preloadedState = createInitialState();

  preloadedState.events.pendingEvents = {
    eventIds: pendingEventIds,
  };

  return configureStore({
    preloadedState,
    reducer: reducers,
  });
};

const renderWithStore = (
  children: React.ReactNode,
  pendingEventIds: string[] = [],
) =>
  render(<Provider store={createStore(pendingEventIds)}>{children}</Provider>);

const expectEventBgToUseHoverColor = (element: HTMLElement) => {
  expect(element.style.getPropertyValue("--event-bg")).toBe(
    gridHoverColorByPriority[Priorities.UNASSIGNED],
  );
};

const RegistrationHarness = ({
  eventId = "event-1",
  eventType = "timed",
  isEnabled = true,
  registry = weekEventRegistry,
}: {
  eventId?: string;
  eventType?: WeekInteractionEventType;
  isEnabled?: boolean;
  registry?: WeekEventRegistry;
}) => {
  const ref = useWeekEventRegistrationRef({
    eventId,
    eventType,
    isEnabled,
    registry,
  });

  return (
    <div
      {...getWeekInteractionTargetAttributes({ eventId, eventType })}
      ref={ref}
    >
      event
    </div>
  );
};

const RegisteredTimedEventHarness = ({
  displayMode = "saved",
  event,
  isPending = false,
}: {
  displayMode?: "draft" | "placeholder" | "saved";
  event: Schema_GridEvent;
  isPending?: boolean;
}) => {
  const isEnabled = Boolean(event._id) && displayMode === "saved" && !isPending;
  const ref = useWeekEventRegistrationRef({
    eventId: event._id,
    eventType: "timed",
    isEnabled,
  });

  return (
    <GridEvent
      displayMode={displayMode}
      event={event}
      interactionAttributes={
        isEnabled
          ? getWeekInteractionTargetAttributes({
              eventId: event._id,
              eventType: "timed",
            })
          : undefined
      }
      isPending={isPending}
      measurements={measurements}
      onEventMouseDown={mock()}
      onScalerMouseDown={mock()}
      ref={ref}
      weekProps={weekProps}
    />
  );
};

const RegisteredAllDayEventHarness = ({
  event,
  isPending = false,
  isPlaceholder = false,
}: {
  event: Schema_GridEvent;
  isPending?: boolean;
  isPlaceholder?: boolean;
}) => {
  const isEnabled = Boolean(event._id) && !isPlaceholder && !isPending;
  const ref = useWeekEventRegistrationRef({
    eventId: event._id,
    eventType: "all-day",
    isEnabled,
  });

  return (
    <AllDayEventMemo
      endOfView={endOfView}
      event={event}
      interactionAttributes={
        isEnabled
          ? getWeekInteractionTargetAttributes({
              eventId: event._id,
              eventType: "all-day",
            })
          : undefined
      }
      isPending={isPending}
      isPlaceholder={isPlaceholder}
      measurements={measurements}
      onMouseDown={mock()}
      onScalerMouseDown={mock()}
      ref={ref}
      startOfView={startOfView}
    />
  );
};

afterEach(() => {
  act(() => {
    __resetSomedayCommitAcknowledgementState();
  });
  weekEventRegistry.clear();
  document.body.innerHTML = "";
});

describe("weekEventRegistry", () => {
  it("registers and unregisters saved timed event elements", () => {
    const event = createTimedEvent();
    const { unmount } = renderWithStore(
      <RegisteredTimedEventHarness event={event} />,
    );

    const element = screen.getByRole("button", { name: /timed event/i });

    expect(weekEventRegistry.resolve("timed-event", "timed")).toBe(element);
    expect(element).toHaveAttribute(
      WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
      "timed-event",
    );
    expect(element).toHaveAttribute(
      WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE,
      "timed",
    );

    unmount();

    expect(weekEventRegistry.resolve("timed-event", "timed")).toBeNull();
  });

  it("registers and unregisters saved all-day event elements", () => {
    const event = createAllDayEvent();
    const { unmount } = renderWithStore(
      <RegisteredAllDayEventHarness event={event} />,
    );

    const element = screen.getByRole("button", { name: /all-day event/i });

    expect(weekEventRegistry.resolve("all-day-event", "all-day")).toBe(element);
    expect(element).toHaveAttribute(
      WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE,
      "all-day",
    );
    expect(
      element.querySelector('[data-week-event-resize-handle="startDate"]'),
    ).toBeTruthy();
    expect(
      element.querySelector('[data-week-event-resize-handle="endDate"]'),
    ).toBeTruthy();

    unmount();

    expect(weekEventRegistry.resolve("all-day-event", "all-day")).toBeNull();
  });

  it("unregisters the old element when a render swaps event ids", () => {
    const registry = createWeekEventRegistry();
    const { rerender } = render(
      <RegistrationHarness eventId="event-1" registry={registry} />,
    );

    expect(registry.resolve("event-1", "timed")).toBeTruthy();

    rerender(<RegistrationHarness eventId="event-2" registry={registry} />);

    expect(registry.resolve("event-1", "timed")).toBeNull();
    expect(registry.resolve("event-2", "timed")).toBeTruthy();
  });

  it("rejects stale or mismatched registrations", () => {
    const registry = createWeekEventRegistry();
    const staleElement = document.createElement("div");

    document.body.append(staleElement);
    registry.register({
      element: staleElement,
      eventId: "event-1",
      eventType: "timed",
    });
    staleElement.remove();

    expect(registry.resolve("event-1", "timed")).toBeNull();

    const mismatchedElement = document.createElement("div");

    document.body.append(mismatchedElement);
    registry.register({
      element: mismatchedElement,
      eventId: "event-2",
      eventType: "timed",
    });
    mismatchedElement.setAttribute(
      WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
      "other-event",
    );

    expect(registry.resolve("event-2", "timed")).toBeNull();
  });

  it("resolves a registered event from child pointer targets", () => {
    const registry = createWeekEventRegistry();
    const element = document.createElement("div");
    const child = document.createElement("span");

    element.append(child);
    document.body.append(element);
    registry.register({
      element,
      eventId: "event-1",
      eventType: "timed",
    });

    expect(registry.resolveFromTarget(child)).toEqual({
      element,
      eventId: "event-1",
      eventType: "timed",
    });
  });

  it("does not register draft or pending timed events as saved targets", () => {
    const draftEvent = createTimedEvent({ _id: "draft-event" });
    const pendingEvent = createTimedEvent({ _id: "pending-event" });

    renderWithStore(
      <>
        <RegisteredTimedEventHarness displayMode="draft" event={draftEvent} />
        <RegisteredTimedEventHarness event={pendingEvent} isPending />
      </>,
      ["pending-event"],
    );

    expect(weekEventRegistry.resolve("draft-event", "timed")).toBeNull();
    expect(weekEventRegistry.resolve("pending-event", "timed")).toBeNull();
  });

  it("acknowledges a dropped timed event without moving the text", () => {
    const event = createTimedEvent({
      endDate: "2026-05-22T10:00:00.000Z",
      startDate: "2026-05-22T09:00:00.000Z",
    });

    markSomedayCommitAcknowledgement(event._id!);
    renderWithStore(<RegisteredTimedEventHarness event={event} />);

    const element = screen.getByRole("button", { name: /timed event/i });
    const title = screen.getByText("Timed event");
    const timeLabel = screen.getByText(/9\s+-\s+10 AM/);

    expect(element).toHaveClass("animate-someday-commit-acknowledge");
    expectEventBgToUseHoverColor(element);
    expect(title).not.toHaveClass("animate-someday-commit-title-rise");
    expect(timeLabel).not.toHaveClass("animate-someday-commit-time-fade");
  });

  it("settles short dropped timed events without text choreography", () => {
    const event = createTimedEvent({
      endDate: "2026-05-18T09:30:00.000Z",
    });

    markSomedayCommitAcknowledgement(event._id!);
    renderWithStore(<RegisteredTimedEventHarness event={event} />);

    const element = screen.getByRole("button", { name: /timed event/i });
    const title = screen.getByText("Timed event");

    expect(element).toHaveClass("animate-someday-commit-acknowledge");
    expectEventBgToUseHoverColor(element);
    expect(title).not.toHaveClass("animate-someday-commit-title-rise");
  });

  it("renders a saved timed event with the Someday preview text style", () => {
    const event = createTimedEvent({
      endDate: "2026-05-22T10:00:00.000Z",
      startDate: "2026-05-22T09:00:00.000Z",
    });

    renderWithStore(<RegisteredTimedEventHarness event={event} />);

    const title = screen.getByText("Timed event");
    const timeLabel = screen.getByText(/9\s+-\s+10 AM/);

    expect(title.style.lineHeight).toBe(GRID_EVENT_TITLE_LINE_HEIGHT);
    expect(timeLabel.style.fontSize).toBe(GRID_EVENT_TIME_LABEL_FONT_SIZE);
    expect(timeLabel.style.opacity).toBe(GRID_EVENT_TIME_LABEL_OPACITY);
    expect(timeLabel.previousElementSibling).toBe(title);
  });

  it("slides the time out when a dropped timed event lands in the past", () => {
    const event = createTimedEvent({
      endDate: "2026-05-18T10:00:00.000Z",
      startDate: "2026-05-18T09:00:00.000Z",
    });

    markSomedayCommitAcknowledgement(event._id!);
    renderWithStore(<RegisteredTimedEventHarness event={event} />);

    const timeLabel = screen.getByText(/9\s+-\s+10 AM/);

    expect(timeLabel).toHaveAttribute("aria-hidden", "true");
    expect(timeLabel).toHaveClass("animate-someday-commit-time-exit");
  });

  it("settles dropped all-day events without text choreography", () => {
    const event = createAllDayEvent();

    markSomedayCommitAcknowledgement(event._id!);
    renderWithStore(<RegisteredAllDayEventHarness event={event} />);

    const element = screen.getByRole("button", { name: /all-day event/i });
    const title = screen.getByText("All-day event");

    expect(element).toHaveClass("animate-someday-commit-acknowledge");
    expectEventBgToUseHoverColor(element);
    expect(title).not.toHaveClass("animate-someday-commit-title-rise");
  });
});

describe("createWeekInteractionEventOverlayMount", () => {
  it("clones a Week event for overlay use without duplicate interactive attributes", () => {
    const source = document.createElement("div");
    const child = document.createElement("button");

    source.id = "source-id";
    source.className = "event-class transition-[background-color]";
    source.setAttribute("tabindex", "0");
    source.setAttribute("aria-describedby", "description-id");
    source.style.width = "100px";
    source.getBoundingClientRect = () =>
      ({
        height: 44,
        left: 12,
        top: 24,
        width: 140,
      }) as DOMRect;
    child.id = "child-id";
    child.setAttribute("aria-controls", "menu-id");
    child.style.transition = "opacity 150ms ease";
    source.append(child);

    const mount = createWeekInteractionEventOverlayMount({
      cursor: "grabbing",
      source,
    });
    const clonedChild = mount.clone.querySelector("button");
    const overlay = new FloatingInteractionOverlay();

    overlay.mount(mount);

    expect(mount.rect).toEqual({
      height: 44,
      left: 12,
      top: 24,
      width: 140,
    });
    expect(mount.clone.className).toBe(source.className);
    expect(mount.clone.id).toBe("");
    expect(mount.clone.getAttribute("tabindex")).toBeNull();
    expect(mount.clone.getAttribute("aria-describedby")).toBeNull();
    expect(mount.clone).toHaveAttribute("aria-hidden", "true");
    expect(mount.clone.style.transition).toBe("none");
    expect(clonedChild?.id).toBe("");
    expect(clonedChild?.getAttribute("aria-controls")).toBeNull();
    expect(clonedChild?.style.transition).toBe("none");
    expect(overlay.getNode()?.style.width).toBe("140px");
    expect(overlay.getNode()?.style.height).toBe("44px");

    overlay.unmount();
  });
});
