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

describe("NowView", () => {
  it("renders the shortcuts overlay", async () => {
    await renderWithMemoryRouter(<NowView />, [ROOT_ROUTES.NOW]);

    // jest cannot actively determine applied pseudo-classes
    // a browser environment should be used for this test
    // move to playwright
    const overlay = screen.getByRole("complementary", { hidden: true });
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute("aria-label", "Shortcut overlay");
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
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
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
