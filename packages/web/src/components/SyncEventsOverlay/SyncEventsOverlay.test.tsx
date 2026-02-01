import { act } from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { selectIsAuthenticating } from "@web/ducks/auth/selectors/auth.selectors";
import {
  selectAwaitingImportResults,
  selectImporting,
} from "@web/ducks/events/selectors/sync.selector";
import { useAppSelector } from "@web/store/store.hooks";
import { SyncEventsOverlay } from "./SyncEventsOverlay";

jest.mock("@web/store/store.hooks", () => ({
  useAppSelector: jest.fn(),
}));

const mockUseAppSelector = useAppSelector as jest.MockedFunction<
  typeof useAppSelector
>;

describe("SyncEventsOverlay", () => {
  let importingValue = false;
  let awaitingValue = false;
  let authenticatingValue = false;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    document.body.removeAttribute("data-app-locked");
    importingValue = false;
    awaitingValue = false;
    authenticatingValue = false;
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectImporting) {
        return importingValue;
      }
      if (selector === selectAwaitingImportResults) {
        return awaitingValue;
      }
      if (selector === selectIsAuthenticating) {
        return authenticatingValue;
      }
      return false;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders nothing when not authenticating, awaiting, or importing", () => {
    const { container } = render(<SyncEventsOverlay />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(container.firstChild).toBeNull();
    expect(document.body.getAttribute("data-app-locked")).toBeNull();
  });

  it("renders OAuth message when authenticating", () => {
    authenticatingValue = true;

    render(<SyncEventsOverlay />);

    expect(screen.getByText("Complete Google sign-in...")).toBeInTheDocument();
    expect(
      screen.getByText("Please complete authorization in the popup window"),
    ).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");
  });

  it("renders import message when awaiting import results", () => {
    awaitingValue = true;

    render(<SyncEventsOverlay />);

    expect(
      screen.getByText("Importing your Google Calendar events..."),
    ).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");
  });

  it("renders import message when importing is true", () => {
    importingValue = true;

    render(<SyncEventsOverlay />);

    expect(
      screen.getByText("Importing your Google Calendar events..."),
    ).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");
  });

  it("does not flash when transitioning from authenticating to awaiting import results", () => {
    authenticatingValue = true;

    const { rerender, container } = render(<SyncEventsOverlay />);

    expect(screen.getByText("Complete Google sign-in...")).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();

    // Transition to awaiting import results
    authenticatingValue = false;
    awaitingValue = true;

    rerender(<SyncEventsOverlay />);

    expect(
      screen.getByText("Importing your Google Calendar events..."),
    ).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });
});
