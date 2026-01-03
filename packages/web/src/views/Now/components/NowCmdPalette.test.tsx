import { fireEvent, screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { NowCmdPalette } from "@web/views/Now/components/NowCmdPalette";
import { ONBOARDING_RESTART_EVENT } from "@web/views/Onboarding/constants/onboarding.constants";
import { resetOnboardingProgress } from "@web/views/Onboarding/utils/onboarding.storage.util";

// Mock pressKey
jest.mock("@web/common/utils/dom/event-emitter.util", () => ({
  pressKey: jest.fn(),
}));

// Mock onEventTargetVisibility
jest.mock("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility: (cb: () => void) => () => cb(),
}));

// Mock resetOnboardingProgress
jest.mock("@web/views/Onboarding/utils/onboarding.storage.util", () => ({
  ...jest.requireActual("@web/views/Onboarding/utils/onboarding.storage.util"),
  resetOnboardingProgress: jest.fn(),
}));

describe("NowCmdPalette", () => {
  const initialState = {
    settings: {
      isCmdPaletteOpen: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render when open", () => {
    render(<NowCmdPalette />, { state: initialState });
    expect(
      screen.getByPlaceholderText("Try: 'day', 'week', 'bug', or 'code'"),
    ).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(<NowCmdPalette />, {
      state: {
        settings: {
          isCmdPaletteOpen: false,
        },
      },
    });
    expect(
      screen.queryByPlaceholderText("Try: 'day', 'week', 'bug', or 'code'"),
    ).not.toBeInTheDocument();
  });

  it("should display navigation items", () => {
    render(<NowCmdPalette />, { state: initialState });
    expect(screen.getByText("Go to Day [2]")).toBeInTheDocument();
    expect(screen.getByText("Go to Week [3]")).toBeInTheDocument();
    expect(screen.getByText("Edit Reminder [r]")).toBeInTheDocument();
    expect(screen.getByText("Re-do onboarding")).toBeInTheDocument();
    expect(screen.getByText("Log Out [z]")).toBeInTheDocument();
  });

  it("should trigger pressKey('2') when 'Go to Day' is clicked", () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Go to Day [2]"));
    expect(pressKey).toHaveBeenCalledWith("2");
  });

  it("should trigger pressKey('3') when 'Go to Week' is clicked", () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Go to Week [3]"));
    expect(pressKey).toHaveBeenCalledWith("3");
  });

  it("should trigger pressKey('r') when 'Edit Reminder' is clicked", () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Edit Reminder [r]"));
    expect(pressKey).toHaveBeenCalledWith("r");
  });

  it("should trigger pressKey('z') when 'Log Out' is clicked", () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Log Out [z]"));
    expect(pressKey).toHaveBeenCalledWith("z");
  });

  it("should reset onboarding and dispatch restart event when 'Re-do onboarding' is clicked", () => {
    const mockDispatchEvent = jest.spyOn(window, "dispatchEvent");
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Re-do onboarding"));
    expect(resetOnboardingProgress).toHaveBeenCalled();
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ONBOARDING_RESTART_EVENT,
      }),
    );
    mockDispatchEvent.mockRestore();
  });
});
