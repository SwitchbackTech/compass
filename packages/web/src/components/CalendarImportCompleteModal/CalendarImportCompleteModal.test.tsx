import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { CalendarImportCompleteModal } from "./CalendarImportCompleteModal";

describe("CalendarImportCompleteModal", () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should render the modal with default message when no counts are provided", () => {
    render(<CalendarImportCompleteModal onDismiss={mockOnDismiss} />);

    expect(
      screen.getByRole("heading", { name: "Calendar Import Complete" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your calendar has been synced successfully!"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("should render the modal with events count message", () => {
    render(
      <CalendarImportCompleteModal eventsCount={5} onDismiss={mockOnDismiss} />,
    );

    expect(screen.getByText("Imported 5 events")).toBeInTheDocument();
  });

  it("should render the modal with singular event count message", () => {
    render(
      <CalendarImportCompleteModal eventsCount={1} onDismiss={mockOnDismiss} />,
    );

    expect(screen.getByText("Imported 1 event")).toBeInTheDocument();
  });

  it("should render the modal with calendars count message", () => {
    render(
      <CalendarImportCompleteModal
        calendarsCount={3}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(screen.getByText("Imported 3 calendars")).toBeInTheDocument();
  });

  it("should render the modal with singular calendar count message", () => {
    render(
      <CalendarImportCompleteModal
        calendarsCount={1}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(screen.getByText("Imported 1 calendar")).toBeInTheDocument();
  });

  it("should render the modal with both events and calendars count message", () => {
    render(
      <CalendarImportCompleteModal
        eventsCount={10}
        calendarsCount={2}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(
      screen.getByText("Imported 10 events from 2 calendars"),
    ).toBeInTheDocument();
  });

  it("should render the modal with local events synced message", () => {
    render(
      <CalendarImportCompleteModal
        localEventsSynced={4}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(
      screen.getByText("4 local events synced to the cloud"),
    ).toBeInTheDocument();
  });

  it("should render the modal with singular local event synced message", () => {
    render(
      <CalendarImportCompleteModal
        localEventsSynced={1}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(
      screen.getByText("1 local event synced to the cloud"),
    ).toBeInTheDocument();
  });

  it("should render both import and local sync messages", () => {
    render(
      <CalendarImportCompleteModal
        eventsCount={10}
        calendarsCount={2}
        localEventsSynced={4}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(
      screen.getByText(/Imported 10 events from 2 calendars/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/4 local events synced to the cloud/),
    ).toBeInTheDocument();
  });

  it("should not show local sync message when count is 0", () => {
    render(
      <CalendarImportCompleteModal
        eventsCount={5}
        localEventsSynced={0}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(screen.getByText("Imported 5 events")).toBeInTheDocument();
    expect(
      screen.queryByText(/local event.*synced to the cloud/),
    ).not.toBeInTheDocument();
  });

  it("should call onDismiss when dismiss button is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CalendarImportCompleteModal onDismiss={mockOnDismiss} />);

    const dismissButton = screen.getByRole("button", { name: "Dismiss" });
    await user.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it("should call onDismiss when clicking outside the modal", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CalendarImportCompleteModal onDismiss={mockOnDismiss} />);

    const backdrop = screen.getByRole("presentation");
    await user.click(backdrop);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it("should not call onDismiss when clicking inside the modal content", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CalendarImportCompleteModal onDismiss={mockOnDismiss} />);

    const dialog = screen.getByRole("dialog");
    await user.click(dialog);

    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it("should call onDismiss when Escape key is pressed", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CalendarImportCompleteModal onDismiss={mockOnDismiss} />);

    const backdrop = screen.getByRole("presentation");
    backdrop.focus();
    await user.keyboard("{Escape}");

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it("should auto-dismiss after 8 seconds", () => {
    render(<CalendarImportCompleteModal onDismiss={mockOnDismiss} />);

    expect(mockOnDismiss).not.toHaveBeenCalled();

    jest.advanceTimersByTime(8000);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it("should clear timeout on unmount", () => {
    const { unmount } = render(
      <CalendarImportCompleteModal onDismiss={mockOnDismiss} />,
    );

    jest.advanceTimersByTime(4000);
    unmount();
    jest.advanceTimersByTime(4000);

    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it("should have correct accessibility attributes", () => {
    render(<CalendarImportCompleteModal onDismiss={mockOnDismiss} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});
