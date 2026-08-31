import { render, screen } from "@testing-library/react";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { describe, expect, it } from "bun:test";

describe("PublicBookingLayout", () => {
  it("opts the public booking page into document scrolling", () => {
    render(
      <PublicBookingLayout>
        <p>Booking content</p>
      </PublicBookingLayout>,
    );

    const main = screen.getByRole("main");
    expect(main).toHaveTextContent("Booking content");
    expect(main.parentElement).toHaveAttribute("data-document-scroll");
    expect(main.className).toContain("max-w-lg");
  });

  it("widens the two-pane picker page", () => {
    render(
      <PublicBookingLayout wide>
        <p>Picker</p>
      </PublicBookingLayout>,
    );

    expect(screen.getByRole("main").className).toContain("max-w-3xl");
  });
});
