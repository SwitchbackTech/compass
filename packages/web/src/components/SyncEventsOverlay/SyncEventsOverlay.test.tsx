import { act } from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { selectIsAuthenticating } from "@web/ducks/auth/selectors/auth.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { SyncEventsOverlay } from "./SyncEventsOverlay";

jest.mock("@web/store/store.hooks", () => ({
  useAppSelector: jest.fn(),
}));

const mockUseAppSelector = useAppSelector as jest.MockedFunction<
  typeof useAppSelector
>;

describe("SyncEventsOverlay", () => {
  let authenticatingValue = false;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    document.body.removeAttribute("data-app-locked");
    authenticatingValue = false;
    mockUseAppSelector.mockImplementation((selector) => {
      if (selector === selectIsAuthenticating) {
        return authenticatingValue;
      }
      return false;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders nothing when not authenticating", () => {
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

  it("unlocks app when authentication completes", () => {
    authenticatingValue = true;

    const { rerender, container } = render(<SyncEventsOverlay />);

    expect(screen.getByText("Complete Google sign-in...")).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");

    // Authentication completes
    authenticatingValue = false;
    rerender(<SyncEventsOverlay />);

    // Wait for buffered visibility to settle
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(container.firstChild).toBeNull();
    expect(document.body.getAttribute("data-app-locked")).toBeNull();
  });
});
