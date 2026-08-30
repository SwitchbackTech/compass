import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BookingCopyLink } from "@web/booking/BookingCopyLink";
import { beforeEach, describe, expect, it, mock } from "bun:test";

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
});
