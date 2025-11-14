import { Provider as ReduxProvider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import { store } from "@web/store";
import { DayView } from "./DayView";

const renderWithRouter = () => {
  return render(
    <ReduxProvider store={store}>
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
        initialEntries={["/day"]}
      >
        <DayView />
      </MemoryRouter>
    </ReduxProvider>,
  );
};

describe("DayView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render TaskList component", () => {
    renderWithRouter();

    const taskpanel = screen.getByRole("region", { name: "daily-tasks" });
    expect(within(taskpanel).getByText("Create task")).toBeInTheDocument();
  });

  it("should render CalendarAgenda component", () => {
    renderWithRouter();

    expect(screen.getByTestId("calendar-scroll")).toBeInTheDocument();
  });
});
