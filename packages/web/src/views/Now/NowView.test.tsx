import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { NowView } from "./NowView";

// Mock the useNowShortcuts hook
jest.mock("./useNowShortcuts", () => ({
  useNowShortcuts: jest.fn(),
}));

describe("NowView", () => {
  it("renders the shortcuts overlay", () => {
    render(<NowView />);

    expect(
      screen.getByRole("complementary", { name: "Shortcut overlay" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
  });

  it("renders global shortcuts", () => {
    render(<NowView />);

    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
  });

  it("renders shortcut keys correctly", () => {
    render(<NowView />);

    // Check that shortcut keys are rendered
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders the main content", () => {
    render(<NowView />);

    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });
});
