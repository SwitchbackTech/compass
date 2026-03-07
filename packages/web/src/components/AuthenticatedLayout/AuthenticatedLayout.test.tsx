import { Route, Routes } from "react-router-dom";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { renderWithMemoryRouter } from "@web/__tests__/utils/providers/MemoryRouter";
import { AuthenticatedLayout } from "./AuthenticatedLayout";

describe("AuthenticatedLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render child routes via Outlet", async () => {
    await renderWithMemoryRouter(
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route
            path="/"
            element={<div data-testid="child-route">Child Content</div>}
          />
        </Route>
      </Routes>,
    );

    expect(screen.getByTestId("child-route")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("should render nested routes correctly", async () => {
    await renderWithMemoryRouter(
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route
            path="/nested"
            element={<div data-testid="nested-route">Nested Content</div>}
          />
        </Route>
      </Routes>,
      ["/nested"],
    );

    expect(screen.getByTestId("nested-route")).toBeInTheDocument();
    expect(screen.getByText("Nested Content")).toBeInTheDocument();
  });
});
