import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AllTasksCompleted } from "./AllTasksCompleted";

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("AllTasksCompleted", () => {
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
        <AllTasksCompleted />
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

  it("navigates to Day view when button is clicked", async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AllTasksCompleted />
      </MemoryRouter>,
    );

    const button = screen.getByText("Go to Day view");
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
