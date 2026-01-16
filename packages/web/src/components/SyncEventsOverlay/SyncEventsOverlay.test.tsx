import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { useSession } from "@web/auth/hooks/useSession";
import { CompassSession } from "@web/auth/session/session.types";
import { selectImporting } from "@web/ducks/events/selectors/sync.selector";
import { useAppSelector } from "@web/store/store.hooks";
import { SyncEventsOverlay } from "./SyncEventsOverlay";

jest.mock("@web/auth/hooks/useSession", () => ({
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
    document.body.removeAttribute("data-app-locked");
    // Default: not importing
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectImporting) {
        return false;
      }
      return selector({} as any);
    });
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
      return selector({} as any);
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
      return selector({} as any);
    });

    render(<SyncEventsOverlay />);

    expect(
      screen.getByText("Importing your Google Calendar events..."),
    ).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");
  });
});
