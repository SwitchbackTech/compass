import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock useNavigate
const actualReactRouterDom =
  require("react-router-dom") as typeof import("react-router-dom");
const { MemoryRouter } = actualReactRouterDom;
const mockNavigate = mock();

mock.module("react-router-dom", () => ({
  ...actualReactRouterDom,
  useNavigate: () => mockNavigate,
}));

const { NoTaskAvailable } =
  require("@web/views/Now/components/NoTaskAvailable/NoTaskAvailable") as typeof import("@web/views/Now/components/NoTaskAvailable/NoTaskAvailable");

describe("NoTaskAvailable", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders completion message and button", () => {
    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <NoTaskAvailable allCompleted={true} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("All tasks completed for today!"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Great work! Add more tasks in the Day view to keep going.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Go to Day view")).toBeInTheDocument();
  });

  it("renders no task message and button", () => {
    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <NoTaskAvailable />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("You don't have any task scheduled."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add tasks in the Day view to get started."),
    ).toBeInTheDocument();
    expect(screen.getByText("Go to Day view")).toBeInTheDocument();
  });

  it("navigates to Day view when button is clicked", async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <NoTaskAvailable />
      </MemoryRouter>,
    );

    const button = screen.getByText("Go to Day view");
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
