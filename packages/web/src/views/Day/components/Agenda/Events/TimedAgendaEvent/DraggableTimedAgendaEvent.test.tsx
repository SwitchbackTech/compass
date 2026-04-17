import { type UseInteractionsReturn } from "@floating-ui/react";
import { ObjectId } from "bson";
import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { BehaviorSubject } from "rxjs";

const CursorItem = {
  EventForm: "EventForm",
  EventPreview: "EventPreview",
  EventContextMenu: "EventContextMenu",
} as const;

const mockGetAgendaEventPosition = mock();
const mockGetEventHeight = mock();
const mockOpenAgendaEventPreview = mock();
const mockOpenEventContextMenu = mock();
const mockOnResize = mock();
const mockOnResizeStart = mock();
const mockOnResizeStop = mock();
const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();
const mockUseEventResizeActions = mock();
const mockUseFloatingNodeIdAtCursor = mock();
const mockUseOpenAgendaEventPreview = mock();
const mockUseOpenEventContextMenu = mock();
const openFloatingAtCursor = mock();
const closeFloatingAtCursor = mock();
const open$ = new BehaviorSubject(false);
const nodeId$ = new BehaviorSubject(null);
const placement$ = new BehaviorSubject("right-start");
const strategy$ = new BehaviorSubject("absolute");
const reference$ = new BehaviorSubject(null);

mock.module("supertokens-web-js", () => ({
  default: {
    init: mockSuperTokensInit,
  },
}));

mock.module("supertokens-web-js/recipe/emailpassword", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/emailverification", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/thirdparty", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/session", () => ({
  attemptRefreshingSession: mock(),
  default: {
    attemptRefreshingSession: mock(),
    doesSessionExist: mock().mockResolvedValue(true),
    getAccessToken: mock().mockResolvedValue("mock-access-token"),
    getAccessTokenPayloadSecurely: mock().mockResolvedValue({}),
    getInvalidClaimsFromResponse: mock().mockResolvedValue([]),
    getUserId: mock().mockResolvedValue("mock-user-id"),
    init: mockRecipeInit,
    signOut: mock().mockResolvedValue(undefined),
    validateClaims: mock().mockResolvedValue([]),
  },
}));

mock.module("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
  useGoogleLogin: () => mock(),
}));

mock.module("@web/views/Day/hooks/events/useOpenAgendaEventPreview", () => ({
  useOpenAgendaEventPreview: mockUseOpenAgendaEventPreview,
}));

mock.module("@web/views/Day/hooks/events/useOpenEventContextMenu", () => ({
  useOpenEventContextMenu: mockUseOpenEventContextMenu,
}));

mock.module("@web/common/hooks/useOpenAtCursor", () => ({
  CursorItem,
  openFloatingAtCursor,
  closeFloatingAtCursor,
  open$,
  nodeId$,
  placement$,
  strategy$,
  reference$,
  setFloatingOpenAtCursor: mock(),
  setFloatingNodeIdAtCursor: mock(),
  setFloatingPlacementAtCursor: mock(),
  setFloatingReferenceAtCursor: mock(),
  setFloatingStrategyAtCursor: mock(),
  isOpenAtCursor: mock(),
  useFloatingNodeIdAtCursor: mockUseFloatingNodeIdAtCursor,
  useFloatingOpenAtCursor: mock(),
  useFloatingPlacementAtCursor: mock(),
  useFloatingStrategyAtCursor: mock(),
  useFloatingReferenceAtCursor: mock(),
}));

mock.module("@web/common/hooks/useEventResizeActions", () => ({
  useEventResizeActions: mockUseEventResizeActions,
}));

mock.module("@web/views/Day/util/agenda/agenda.util", () => ({
  getAgendaEventPosition: mockGetAgendaEventPosition,
  getEventHeight: mockGetEventHeight,
}));

const { render } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { DraggableTimedAgendaEvent } =
  require("@web/views/Day/components/Agenda/Events/TimedAgendaEvent/DraggableTimedAgendaEvent") as typeof import("@web/views/Day/components/Agenda/Events/TimedAgendaEvent/DraggableTimedAgendaEvent");

describe("DraggableTimedAgendaEvent", () => {
  const standaloneEvent = createMockStandaloneEvent();

  const baseEvent: Schema_GridEvent = {
    ...standaloneEvent,
    startDate: "2023-01-01T10:00:00Z",
    endDate: "2023-01-01T11:00:00Z",
    origin: standaloneEvent.origin!,
    priority: standaloneEvent.priority!,
    user: standaloneEvent.user!,
    position: gridEventDefaultPosition,
  };

  const defaultProps = {
    bounds: document.createElement("div"),
    interactions: {
      getReferenceProps: mock((props) => props),
      getFloatingProps: mock(),
      getItemProps: mock(),
    } as unknown as UseInteractionsReturn,
    isDraftEvent: false,
    isNewDraftEvent: false,
    isDisabled: false,
  };

  beforeEach(() => {
    mockGetAgendaEventPosition.mockClear();
    mockGetEventHeight.mockClear();
    mockOpenAgendaEventPreview.mockClear();
    mockOpenEventContextMenu.mockClear();
    mockOnResize.mockClear();
    mockOnResizeStart.mockClear();
    mockOnResizeStop.mockClear();
    mockUseEventResizeActions.mockClear();
    mockUseFloatingNodeIdAtCursor.mockClear();
    mockUseOpenAgendaEventPreview.mockClear();
    mockUseOpenEventContextMenu.mockClear();

    mockUseOpenAgendaEventPreview.mockReturnValue(mockOpenAgendaEventPreview);
    mockUseOpenEventContextMenu.mockReturnValue(mockOpenEventContextMenu);
    mockUseFloatingNodeIdAtCursor.mockReturnValue(null);
    mockUseEventResizeActions.mockReturnValue({
      onResize: mockOnResize,
      onResizeStart: mockOnResizeStart,
      onResizeStop: mockOnResizeStop,
    });
    mockGetAgendaEventPosition.mockReturnValue(100);
    mockGetEventHeight.mockReturnValue(50);
  });

  it("should render correctly", () => {
    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventElement = screen.getByRole("button");
    expect(eventElement).toBeInTheDocument();
    expect(eventElement).toHaveStyle({ top: "100px", height: "50px" });
    expect(eventElement).toHaveAttribute("aria-label", baseEvent.title);
  });

  it("should not render when startDate is missing", () => {
    const event: Partial<Schema_GridEvent> = {
      ...baseEvent,
      startDate: undefined,
    };

    render(
      <DraggableTimedAgendaEvent
        event={event as Schema_GridEvent}
        {...defaultProps}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should call openAgendaEventPreview on focus", () => {
    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventElement = screen.getByRole("button");
    fireEvent.focus(eventElement);

    expect(mockOpenAgendaEventPreview).toHaveBeenCalled();
  });

  it("should call openAgendaEventPreview on pointer enter", () => {
    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventElement = screen.getByRole("button");
    fireEvent.pointerEnter(eventElement);

    expect(mockOpenAgendaEventPreview).toHaveBeenCalled();
  });

  it("should call openEventContextMenu on context menu", () => {
    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventElement = screen.getByRole("button");
    fireEvent.contextMenu(eventElement);

    expect(mockOpenEventContextMenu).toHaveBeenCalled();
  });

  it("should not call interactions when event form is open", () => {
    mockUseFloatingNodeIdAtCursor.mockReturnValue(CursorItem.EventForm);

    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventElement = screen.getByRole("button");

    fireEvent.focus(eventElement);
    expect(mockOpenAgendaEventPreview).not.toHaveBeenCalled();

    fireEvent.pointerEnter(eventElement);
    expect(mockOpenAgendaEventPreview).not.toHaveBeenCalled();

    fireEvent.contextMenu(eventElement);
    expect(mockOpenEventContextMenu).not.toHaveBeenCalled();
  });

  it("should render correctly with event", () => {
    const eventId = new ObjectId().toString();
    const event: Schema_GridEvent = {
      ...baseEvent,
      _id: eventId,
    };

    render(<DraggableTimedAgendaEvent event={event} {...defaultProps} />);

    const eventElement = screen.getByRole("button");
    expect(eventElement).toBeInTheDocument();
    expect(eventElement).toHaveAttribute("data-event-id", eventId);
  });

  it("should disable dragging when event is pending", () => {
    const eventId = new ObjectId().toString();
    const event: Schema_GridEvent = {
      ...baseEvent,
      _id: eventId,
    };

    render(
      <DraggableTimedAgendaEvent
        event={event}
        {...defaultProps}
        isDisabled={true}
      />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toBeInTheDocument();
    expect(eventElement).toHaveClass("cursor-wait");
  });

  it("should not disable dragging when event is not pending", () => {
    const eventId = new ObjectId().toString();
    const event: Schema_GridEvent = {
      ...baseEvent,
      _id: eventId,
    };

    render(
      <DraggableTimedAgendaEvent
        event={event}
        {...defaultProps}
        isDisabled={false}
      />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toBeInTheDocument();
    expect(eventElement).toHaveClass("cursor-pointer");
    expect(eventElement).not.toHaveClass("cursor-wait");
  });
});
