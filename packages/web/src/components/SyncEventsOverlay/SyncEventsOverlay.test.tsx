import { act } from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { useSession } from "@web/auth/hooks/session/useSession";
import { CompassSession } from "@web/auth/session/session.types";
import { selectIsAuthenticating } from "@web/ducks/auth/selectors/auth.selectors";
import { selectImporting } from "@web/ducks/events/selectors/sync.selector";
import { useAppSelector } from "@web/store/store.hooks";
import { SyncEventsOverlay } from "./SyncEventsOverlay";

jest.mock("@web/auth/hooks/session/useSession", () => ({
  useSession: jest.fn(),
}));

jest.mock("@web/store/store.hooks", () => ({
  useAppSelector: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseAppSelector = useAppSelector as jest.MockedFunction<
  typeof useAppSelector
>;

describe("SyncEventsOverlay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    document.body.removeAttribute("data-app-locked");
    // Default: not importing, not authenticating
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectImporting) {
        return false;
      }
      if (selector === selectIsAuthenticating) {
        return false;
      }
      return false;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders nothing when not syncing and not importing", () => {
    const mockSession: CompassSession = {
      isSyncing: false,
      authenticated: false,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: jest.fn(),
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

    const { container } = render(<SyncEventsOverlay />);

    // Advance timers to handle visibility buffer
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(container.firstChild).toBeNull();
    expect(document.body.getAttribute("data-app-locked")).toBeNull();
  });

  it("renders overlay with OAuth message when syncing but not importing (OAuth phase)", () => {
    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: jest.fn(),
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

    render(<SyncEventsOverlay />);

    expect(screen.getByText("Complete Google sign-in...")).toBeInTheDocument();
    expect(
      screen.getByText("Please complete authorization in the popup window"),
    ).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");
  });

  it("sets data-app-locked attribute when syncing starts", () => {
    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: jest.fn(),
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

    render(<SyncEventsOverlay />);

    expect(document.body.getAttribute("data-app-locked")).toBe("true");
  });

  it("removes data-app-locked attribute when syncing and importing stop", () => {
    const { rerender } = render(<SyncEventsOverlay />);

    const mockSessionSyncing: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: jest.fn(),
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSessionSyncing);

    rerender(<SyncEventsOverlay />);
    expect(document.body.getAttribute("data-app-locked")).toBe("true");

    const mockSessionNotSyncing: CompassSession = {
      isSyncing: false,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: jest.fn(),
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSessionNotSyncing);

    rerender(<SyncEventsOverlay />);

    // Advance timers to handle visibility buffer (50ms delay before hiding)
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(document.body.getAttribute("data-app-locked")).toBeNull();
  });

  it("blurs active element when syncing starts", () => {
    const mockBlur = jest.fn();
    const mockElement = {
      blur: mockBlur,
    } as unknown as HTMLElement;

    Object.defineProperty(document, "activeElement", {
      writable: true,
      value: mockElement,
    });

    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: jest.fn(),
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

    render(<SyncEventsOverlay />);

    expect(mockBlur).toHaveBeenCalled();
  });

  it("renders overlay when importing is true even if isSyncing is false", () => {
    const mockSession: CompassSession = {
      isSyncing: false,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: jest.fn(),
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectImporting) {
        return true; // importing = true
      }
      if (selector === selectIsAuthenticating) {
        return false;
      }
      return false;
    });

    render(<SyncEventsOverlay />);

    expect(
      screen.getByText("Importing your Google Calendar events..."),
    ).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");
  });

  it("renders overlay when both isSyncing and importing are true", () => {
    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: true,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: jest.fn(),
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectImporting) {
        return true; // importing = true
      }
      if (selector === selectIsAuthenticating) {
        return false;
      }
      return false;
    });

    render(<SyncEventsOverlay />);

    expect(
      screen.getByText("Importing your Google Calendar events..."),
    ).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");
  });

  it("does not flash when transitioning from authenticating to importing", () => {
    // This test validates the fix for the race condition where the overlay
    // would briefly disappear during the OAuth → import transition.
    // The scenario: isAuthenticating=true → isAuthenticating=false, importing=false → importing=true
    // Without the visibility buffer, the middle state causes a flash.

    const mockSession: CompassSession = {
      isSyncing: true,
      authenticated: false,
      loading: false,
      setAuthenticated: jest.fn(),
      setIsSyncing: jest.fn(),
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);

    // Phase 1: OAuth in progress (isAuthenticating=true)
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectImporting) return false;
      if (selector === selectIsAuthenticating) return true;
      return false;
    });

    const { rerender, container } = render(<SyncEventsOverlay />);

    expect(screen.getByText("Complete Google sign-in...")).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();

    // Phase 2: Race condition - both states momentarily false
    // This simulates what happens between authSuccess() and importing(true)
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectImporting) return false;
      if (selector === selectIsAuthenticating) return false;
      return false;
    });

    rerender(<SyncEventsOverlay />);

    // CRITICAL: Overlay should still be visible due to visibility buffer
    // The 50ms delay prevents the flash
    expect(container.firstChild).not.toBeNull();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");

    // Phase 3: Import starts (importing=true) - within the 50ms buffer window
    act(() => {
      jest.advanceTimersByTime(30); // Still within 50ms buffer
    });

    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectImporting) return true;
      if (selector === selectIsAuthenticating) return false;
      return false;
    });

    rerender(<SyncEventsOverlay />);

    // Overlay should now show import message, having never disappeared
    expect(
      screen.getByText("Importing your Google Calendar events..."),
    ).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });
});
