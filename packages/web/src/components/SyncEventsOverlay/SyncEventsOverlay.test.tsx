import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { CompassSession } from "@web/auth/session/session.types";
import { useSession } from "@web/common/hooks/useSession";
import { SyncEventsOverlay } from "./SyncEventsOverlay";

jest.mock("@web/common/hooks/useSession", () => ({
  useSession: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe("SyncEventsOverlay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.removeAttribute("data-app-locked");
  });

  it("renders nothing when not syncing", () => {
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

    expect(container.firstChild).toBeNull();
    expect(document.body.getAttribute("data-app-locked")).toBeNull();
  });

  it("renders overlay with correct message when syncing", () => {
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

    expect(
      screen.getByText("Importing your Google Calendar events..."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Please wait while we sync your calendar. You won't be able to create events until this is complete.",
      ),
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

  it("removes data-app-locked attribute when syncing stops", () => {
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
});
