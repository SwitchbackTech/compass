import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { renderWithMemoryRouter } from "@web/__tests__/utils/providers/MemoryRouter";
import { Header } from "./Header";

describe("Header", () => {
  it("renders the header with reminder and view selector when showReminder is true", async () => {
    await renderWithMemoryRouter(<Header showReminder={true} />);

    // Check that Reminder component is rendered (shows placeholder when no reminder)
    expect(screen.getByText("Click to add your reminder")).toBeInTheDocument();

    // Check that SelectView component is rendered
    expect(
      screen.getByRole("button", { name: /select view/i }),
    ).toBeInTheDocument();
  });

  it("does not render the reminder when showReminder is false", async () => {
    await renderWithMemoryRouter(<Header showReminder={false} />);

    // Check that Reminder component is NOT rendered
    expect(
      screen.queryByText("Click to add your reminder"),
    ).not.toBeInTheDocument();

    // Check that SelectView component is still rendered
    expect(
      screen.getByRole("button", { name: /select view/i }),
    ).toBeInTheDocument();
  });

  it("renders with proper layout structure", async () => {
    await renderWithMemoryRouter(<Header showReminder={true} />);

    // Check that the header row exists
    expect(screen.getByText("Click to add your reminder")).toBeInTheDocument();
  });
});
