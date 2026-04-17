import { beforeEach, describe, expect, it, mock, vi } from "bun:test";
import { afterAll } from "bun:test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { AuthenticatedLayout } from "./AuthenticatedLayout";

mock.module("@web/components/SyncEventsOverlay/SyncEventsOverlay", () => ({
  SyncEventsOverlay: () => null,
}));

describe("AuthenticatedLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render child routes via Outlet", async () => {
    render(
      <MemoryRouter
        initialEntries={["/"]}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route
            path="/"
            element={<div data-testid="child-route">Child Content</div>}
          />
        </Route>
      </Routes>,
      </MemoryRouter>,
    );

    expect(screen.getByTestId("child-route")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("should render nested routes correctly", async () => {
    render(
      <MemoryRouter
        initialEntries={["/nested"]}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route
            path="/nested"
            element={<div data-testid="nested-route">Nested Content</div>}
          />
        </Route>
      </Routes>,
      </MemoryRouter>,
    );

    expect(screen.getByTestId("nested-route")).toBeInTheDocument();
    expect(screen.getByText("Nested Content")).toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
