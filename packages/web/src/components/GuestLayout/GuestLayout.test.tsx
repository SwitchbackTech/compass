import { render, screen } from "@testing-library/react";
import { GuestLayout } from "./GuestLayout";

// Mock dependencies
jest.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
}));

const mockUseGlobalShortcuts = jest.fn();
jest.mock("@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts", () => ({
  useGlobalShortcuts: () => mockUseGlobalShortcuts(),
}));

describe("GuestLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render Outlet content", () => {
    render(<GuestLayout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.getByText("Outlet Content")).toBeInTheDocument();
  });

  it("should enable global shortcuts", () => {
    render(<GuestLayout />);
    expect(mockUseGlobalShortcuts).toHaveBeenCalled();
  });
});
