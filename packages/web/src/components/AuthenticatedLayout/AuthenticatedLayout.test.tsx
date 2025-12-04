import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { AuthenticatedLayout } from "./AuthenticatedLayout";

describe("AuthenticatedLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });
});
