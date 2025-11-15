import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { NowView } from "./NowView";

// Mock the useNowShortcuts hook
jest.mock("./useNowShortcuts", () => ({
  useNowShortcuts: jest.fn(),
}));

describe("NowView", () => {
  it("renders the shortcuts overlay", () => {
    render(
      <MemoryRouter>
        <NowView />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("complementary", { name: "Shortcut overlay" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
  });

  it("renders global shortcuts", () => {
    render(
      <MemoryRouter>
        <NowView />
      </MemoryRouter>,
    );

    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
  });

  it("renders shortcut keys correctly", () => {
    render(
      <MemoryRouter>
        <NowView />
      </MemoryRouter>,
    );

    // Check that shortcut keys are rendered
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
