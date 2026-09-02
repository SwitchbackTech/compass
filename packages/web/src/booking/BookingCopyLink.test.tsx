import "@testing-library/jest-dom";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingCopyLink } from "@web/booking/BookingCopyLink";
import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

describe("BookingCopyLink", () => {
  const mockWriteText = mock(() => Promise.resolve());

  beforeEach(() => {
    mockWriteText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: mockWriteText },
    });
  });

  it("copies the booking link", async () => {
    const bookingUrl = "https://compasscalendar.com/book/hostuser";
    render(<BookingCopyLink bookingUrl={bookingUrl} />);

    fireEvent.click(screen.getByLabelText("Copy booking link"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(bookingUrl);
    });
  });

  it("opens the public booking page in a new tab", () => {
    const bookingUrl = "https://compasscalendar.com/book/hostuser";
    render(<BookingCopyLink bookingUrl={bookingUrl} />);

    const openLink = screen.getByRole("link", { name: "Open booking page" });
    expect(openLink).toHaveAttribute("href", bookingUrl);
    expect(openLink).toHaveAttribute("target", "_blank");
    expect(openLink).toHaveAttribute("rel", "noreferrer");
  });

  it("explains the copy icon in a tooltip", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <BookingCopyLink bookingUrl="https://compasscalendar.com/book/hostuser" />,
    );

    await user.hover(screen.getByRole("button", { name: "Copy booking link" }));
    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "Copy booking link",
    );
  });

  it("explains the open-page icon in a tooltip", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <BookingCopyLink bookingUrl="https://compasscalendar.com/book/hostuser" />,
    );

    await user.hover(screen.getByRole("link", { name: "Open booking page" }));
    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "Open booking page",
    );
  });
});

const originalClipboard = navigator.clipboard;

const setClipboard = (value: unknown) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value,
    writable: true,
  });
};

afterEach(() => {
  cleanup();
  setClipboard(originalClipboard);
});

describe("copyText", () => {
  it("reports success when the write lands", async () => {
    const writeText = mock(() => Promise.resolve());
    setClipboard({ writeText });

    expect(await copyText("https://example.com/book/tyler")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.com/book/tyler");
  });

  it("reports failure instead of rejecting when permission is denied", async () => {
    // The three call sites used to invoke writeText with no .catch(), so this
    // surfaced as an unhandled rejection and the button just sat there.
    setClipboard({ writeText: () => Promise.reject(new Error("denied")) });

    expect(await copyText("anything")).toBe(false);
  });

  it("reports failure when there is no clipboard at all", async () => {
    setClipboard(undefined);

    expect(await copyText("anything")).toBe(false);
  });
});
