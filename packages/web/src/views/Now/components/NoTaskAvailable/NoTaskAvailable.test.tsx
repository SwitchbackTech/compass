import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { NoTaskAvailable } from "@web/views/Now/components/NoTaskAvailable/NoTaskAvailable";

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("NoTaskAvailable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
