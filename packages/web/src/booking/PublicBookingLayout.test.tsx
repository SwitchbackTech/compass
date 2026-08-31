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

    expect(document.querySelector("[data-document-scroll]")).toBeTruthy();
    expect(screen.getByRole("main")).toHaveTextContent("Booking content");
  });
});
