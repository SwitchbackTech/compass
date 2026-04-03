import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { renderWithMemoryRouter } from "@web/__tests__/utils/providers/MemoryRouter";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { getModifierKeyTestId } from "@web/common/utils/shortcut/shortcut.util";
import { NowView } from "@web/views/Now/view/NowView";

// Mock the useNowShortcuts hook
jest.mock("../shortcuts/useNowShortcuts", () => ({
  useNowShortcuts: jest.fn(),
}));

jest.mock("@web/views/Now/view/NowViewContent", () => ({
  NowViewContent: () => <div data-testid="now-view-content" />,
}));

jest.mock("@web/views/Now/hooks/useAvailableTasks", () => ({
  useAvailableTasks: () => ({
    availableTasks: [],
    allTasks: [],
    hasCompletedTasks: false,
  }),
}));

// Mock matchMedia to simulate wide screen (sidebar visible)
const mockMatchMedia = (matches: boolean) => ({
  matches,
  media: "",
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

describe("NowView", () => {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Simulate wide screen so sidebar is visible
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1400,
    });
    window.matchMedia = jest.fn().mockReturnValue(mockMatchMedia(true));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });
  it("renders the shortcuts sidebar", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // jest cannot actively determine applied pseudo-classes
    // a browser environment should be used for this test
    // move to playwright
    const sidebar = screen.getByRole("complementary", { hidden: true });
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute("aria-label", "Shortcuts sidebar");
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
  });

  it("renders the header with reminder and view selector", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // Check that Header components are rendered
    expect(screen.getByText("Click to add your reminder")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select view/i }),
    ).toBeInTheDocument();
  });

  it("renders global shortcuts", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getAllByText("Now")).toHaveLength(3);
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getAllByText("Week")).toHaveLength(1);
  });

  it("renders shortcut keys correctly", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // Check that shortcut keys are rendered
    expect(screen.getByText("Edit description")).toBeInTheDocument();
    expect(screen.getAllByTestId("e-icon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("n-icon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("d-icon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("w-icon").length).toBeGreaterThan(0);
  });

  it("renders command palette shortcut", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // Check that CMD+K shortcut is displayed
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(
      screen.getAllByTestId(getModifierKeyTestId())[0],
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("k-icon")[0]).toBeInTheDocument();
    expect(screen.getByText("Command Palette")).toBeInTheDocument();
  });

  it("renders the main layout structure", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // Check that the main calendar container is rendered
    const mainElement = document.getElementById("mainSection");
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass(
      "bg-bg-primary",
      "flex",
      "h-screen",
      "overflow-hidden",
      "flex-1",
      "flex-col",
      "items-center",
      "justify-center",
      "p-8",
    );
  });
});
