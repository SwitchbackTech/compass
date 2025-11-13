import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StorageInfoBanner } from "./StorageInfoBanner";

const STORAGE_DISMISS_KEY = "compass.day.storage-info-dismissed";

describe("StorageInfoBanner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should render on first visit", () => {
    render(<StorageInfoBanner />);

    expect(
      screen.getByText(
        /Your day tasks are saved in your browser's local storage/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Think of day tasks as simple ways to stay focused/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We'll store your tasks in our cloud database/i),
    ).toBeInTheDocument();
  });

  it("should not render when dismissed", () => {
    localStorage.setItem(STORAGE_DISMISS_KEY, "true");
    render(<StorageInfoBanner />);

    expect(
      screen.queryByText(/Your day tasks are saved/i),
    ).not.toBeInTheDocument();
  });

  it("should dismiss when Got it button is clicked", async () => {
    const user = userEvent.setup();
    render(<StorageInfoBanner />);

    const dismissButton = screen.getByRole("button", {
      name: /dismiss storage information/i,
    });
    await user.click(dismissButton);

    expect(
      screen.queryByText(/Your day tasks are saved/i),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_DISMISS_KEY)).toBe("true");
  });

  it("should remember dismissal state after re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<StorageInfoBanner />);

    const dismissButton = screen.getByRole("button", {
      name: /dismiss storage information/i,
    });
    await user.click(dismissButton);

    rerender(<StorageInfoBanner />);

    expect(
      screen.queryByText(/Your day tasks are saved/i),
    ).not.toBeInTheDocument();
  });

  it("should reappear after localStorage is cleared and component remounts", () => {
    localStorage.setItem(STORAGE_DISMISS_KEY, "true");
    const { unmount } = render(<StorageInfoBanner />);

    expect(
      screen.queryByText(/Your day tasks are saved/i),
    ).not.toBeInTheDocument();

    localStorage.removeItem(STORAGE_DISMISS_KEY);
    unmount();

    // Remount the component - it should now show the banner
    render(<StorageInfoBanner />);

    expect(screen.getByText(/Your day tasks are saved/i)).toBeInTheDocument();
  });
});
