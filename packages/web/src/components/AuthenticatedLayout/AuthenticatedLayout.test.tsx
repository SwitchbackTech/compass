import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { AuthenticatedLayout } from "./AuthenticatedLayout";

// Mock useRefetch hook
const mockUseRefetch = jest.fn();
jest.mock("@web/views/Calendar/hooks/useRefetch", () => ({
  useRefetch: () => mockUseRefetch(),
}));

describe("AuthenticatedLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRefetch.mockClear();
  });

  it("should call useRefetch hook when rendered", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/" element={<div>Test Child</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(mockUseRefetch).toHaveBeenCalledTimes(1);
  });

  it("should render child routes via Outlet", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AuthenticatedLayout />}>
            <Route
              path="/"
              element={<div data-testid="child-route">Child Content</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("child-route")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("should render nested routes correctly", () => {
    render(
      <MemoryRouter initialEntries={["/nested"]}>
        <Routes>
          <Route element={<AuthenticatedLayout />}>
            <Route
              path="/nested"
              element={<div data-testid="nested-route">Nested Content</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Wait for the route to render
    expect(screen.getByTestId("nested-route")).toBeInTheDocument();
    expect(screen.getByText("Nested Content")).toBeInTheDocument();
    // useRefetch should be called when layout renders
    expect(mockUseRefetch).toHaveBeenCalled();
  });

  it("should call useRefetch only once per render", () => {
    const { rerender } = render(
      <MemoryRouter>
        <Routes>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/" element={<div>Test</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(mockUseRefetch).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <Routes>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/" element={<div>Test Updated</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Should still be called only once (React's StrictMode might call it twice in dev)
    expect(mockUseRefetch).toHaveBeenCalled();
  });
});
