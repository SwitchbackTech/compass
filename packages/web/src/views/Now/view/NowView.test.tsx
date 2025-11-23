import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { renderWithMemoryRouter } from "@web/__tests__/utils/providers/MemoryRouter";
import { NowView } from "@web/views/Now/view/NowView";

// Mock the useNowShortcuts hook
jest.mock("../shortcuts/useNowShortcuts", () => ({
  useNowShortcuts: jest.fn(),
}));

describe("NowView", () => {
  it("renders the shortcuts overlay", async () => {
    await renderWithMemoryRouter(<NowView />);

    expect(
      screen.getByRole("complementary", { name: "Shortcut overlay" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
  });

  it("renders the header with reminder and view selector", async () => {
    await renderWithMemoryRouter(<NowView />);

    // Check that Header components are rendered
    expect(screen.getByText("Click to add your reminder")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select view/i }),
    ).toBeInTheDocument();
  });

  it("renders global shortcuts", async () => {
    await renderWithMemoryRouter(<NowView />);

    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getAllByText("Now")).toHaveLength(2);
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getAllByText("Week")).toHaveLength(2);
  });

  it("renders shortcut keys correctly", async () => {
    await renderWithMemoryRouter(<NowView />);

    // Check that shortcut keys are rendered
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders command palette shortcut", async () => {
    await renderWithMemoryRouter(<NowView />);

    // Check that CMD+K shortcut is displayed
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    expect(screen.getByText("Command Palette")).toBeInTheDocument();
  });

  it("renders the main layout structure", async () => {
    await renderWithMemoryRouter(<NowView />);

    // Check that the main calendar container is rendered
    const mainElement = document.getElementById("mainSection");
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass(
      "flex-column",
      "flex",
      "h-screen",
      "overflow-hidden",
    );
  });
});
