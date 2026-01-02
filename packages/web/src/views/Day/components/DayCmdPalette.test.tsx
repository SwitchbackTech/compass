import { act } from "react";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { keyPressed$ } from "@web/common/utils/dom/event-emitter.util";
import * as eventUtil from "@web/common/utils/event/event.util";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useGlobalShortcuts } from "@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts";
import { DayCmdPalette } from "@web/views/Day/components/DayCmdPalette";

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

// Mock dayjs
jest.mock("@core/util/date/dayjs", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    format: jest.fn(() => "Monday, November 24"),
    startOf: jest.fn().mockReturnThis(),
    endOf: jest.fn().mockReturnThis(),
  })),
}));

// Mock window.open
const mockWindowOpen = jest.fn();
global.window.open = mockWindowOpen;

// Mock dispatch
const mockDispatch = jest.fn();

// Mock onEventTargetVisibility
jest.mock("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility: (callback: () => void) => callback,
}));

// Mock event utility functions
jest.mock("@web/common/utils/event/event.util");

jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: jest.requireActual("@web/store/store.hooks").useAppSelector,
}));

function Component() {
  useGlobalShortcuts();

  return <DayCmdPalette />;
}

describe("DayCmdPalette", () => {
  const mockOpenEventFormCreateEvent = jest.spyOn(
    eventUtil,
    "openEventFormCreateEvent",
  );
  const mockOpenEventFormEditEvent = jest.spyOn(
    eventUtil,
    "openEventFormEditEvent",
  );

  beforeEach(() => {
    jest.clearAllMocks();
    keyPressed$.next(null);

    (require("react-router-dom").useNavigate as jest.Mock).mockReturnValue(
      mockNavigate,
    );
  });

  it("renders navigation items when open", async () => {
    await act(() =>
      render(<Component />, {
        state: { settings: { isCmdPaletteOpen: true } },
      }),
    );

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Go to Now [1]")).toBeInTheDocument();
    expect(screen.getByText("Go to Week [3]")).toBeInTheDocument();
    expect(screen.getByText("Create event [n]")).toBeInTheDocument();
    expect(screen.getByText("Edit event [m]")).toBeInTheDocument();
    expect(
      screen.getByText("Go to Today (Monday, November 24) [t]"),
    ).toBeInTheDocument();
    expect(screen.getByText("Re-do onboarding")).toBeInTheDocument();
    expect(screen.getByText("Log Out [z]")).toBeInTheDocument();
  });

  it("does not render when closed", async () => {
    await act(() =>
      render(<Component />, {
        state: { settings: { isCmdPaletteOpen: false } },
      }),
    );

    expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
  });

  it("closes the command palette when Escape key is pressed", async () => {
    const user = userEvent.setup();
    await act(() =>
      render(<Component />, {
        state: { settings: { isCmdPaletteOpen: true } },
      }),
    );

    // Simulate CMD+k key press to open
    await act(() =>
      user.keyboard(`{${getModifierKey()}>}k{/${getModifierKey()}}`),
    );

    expect(screen.getByText("Navigation")).toBeInTheDocument();

    // Simulate Escape key press
    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
  });

  it("navigates to now when Go to Now is clicked", async () => {
    const user = userEvent.setup();
    await act(() =>
      render(<Component />, {
        state: { settings: { isCmdPaletteOpen: true } },
      }),
    );

    await act(() => user.click(screen.getByText("Go to Now [1]")));

    expect(mockNavigate).toHaveBeenCalledWith("/now");
  });

  it("navigates to week when Go to Week is clicked", async () => {
    const user = userEvent.setup();
    await act(() =>
      render(<Component />, {
        state: { settings: { isCmdPaletteOpen: true } },
      }),
    );

    await act(() => user.click(screen.getByText("Go to Week [3]")));

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("calls onGoToToday when Go to Today is clicked", async () => {
    const mockOnGoToToday = jest.fn();
    const user = userEvent.setup();
    await act(() =>
      render(<DayCmdPalette onGoToToday={mockOnGoToToday} />, {
        state: { settings: { isCmdPaletteOpen: true } },
      }),
    );

    await act(() =>
      user.click(screen.getByText("Go to Today (Monday, November 24) [t]")),
    );

    expect(mockOnGoToToday).toHaveBeenCalled();
  });

  it("opens onboarding in new tab when Re-do onboarding is clicked", async () => {
    const user = userEvent.setup();
    await act(() =>
      render(<Component />, {
        state: { settings: { isCmdPaletteOpen: true } },
      }),
    );

    await act(() => user.click(screen.getByText("Re-do onboarding")));

    expect(mockWindowOpen).toHaveBeenCalledWith("/onboarding", "_blank");
  });

  it("navigates to logout when Log Out is clicked", async () => {
    const user = userEvent.setup();
    await act(() =>
      render(<Component />, {
        state: { settings: { isCmdPaletteOpen: true } },
      }),
    );

    await act(() => user.click(screen.getByText("Log Out [z]")));

    expect(mockNavigate).toHaveBeenCalledWith("/logout");
  });

  it("calls openEventFormEditEvent when Edit event is clicked", async () => {
    const user = userEvent.setup();

    await act(() =>
      render(<Component />, {
        state: { settings: { isCmdPaletteOpen: true } },
      }),
    );

    const editEventBtn = await screen.findByRole("button", {
      name: /edit event \[m\]/i,
    });

    await act(() => user.click(editEventBtn));

    expect(mockOpenEventFormEditEvent).toHaveBeenCalled();
  });

  it("calls openEventFormCreateEvent when Create event is clicked", async () => {
    const user = userEvent.setup();

    await act(() =>
      render(<Component />, {
        state: { settings: { isCmdPaletteOpen: true } },
      }),
    );

    const createEventBtn = await screen.findByRole("button", {
      name: /create event \[n\]/i,
    });

    await act(() => user.click(createEventBtn));

    expect(mockOpenEventFormCreateEvent).toHaveBeenCalled();
  });

  it("filters items based on search input", async () => {
    const user = userEvent.setup();
    await act(() =>
      render(<Component />, {
        state: { settings: { isCmdPaletteOpen: true } },
      }),
    );

    const searchInput = screen.getByPlaceholderText(
      "Try: 'now', 'week', 'today', 'bug', or 'code'",
    );

    await act(async () => {
      await user.type(searchInput, "now");
    });

    expect(screen.getByText("Go to Now [1]")).toBeInTheDocument();
    expect(screen.queryByText("Go to Week [3]")).not.toBeInTheDocument();
  });
});
