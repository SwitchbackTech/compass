import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicBookingSlotPicker } from "@web/booking/PublicBookingSlotPicker";
import { formatBookingSlotDateHeading } from "@web/booking/public-booking.format";
import { describe, expect, it } from "bun:test";

const timeZone = "UTC";
const dayA = "2026-08-17T15:00:00.000Z";
const dayALater = "2026-08-17T16:00:00.000Z";
const dayB = "2026-08-20T15:00:00.000Z";

const slots = [
  { slotStart: dayA, slotEnd: "2026-08-17T15:30:00.000Z" },
  { slotStart: dayALater, slotEnd: "2026-08-17T16:30:00.000Z" },
  { slotStart: dayB, slotEnd: "2026-08-20T15:30:00.000Z" },
];

describe("PublicBookingSlotPicker", () => {
  it("shows only the selected day's times", () => {
    const selected: string[] = [];
    render(
      <PublicBookingSlotPicker
        slots={slots}
        selectedDateKey="2026-08-17"
        guestTimeZone={timeZone}
        selectedSlotStart={null}
        onSelectSlot={(slotStart) => {
          selected.push(slotStart);
        }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: formatBookingSlotDateHeading(dayA, timeZone),
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /3:00 PM|15:00/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /4:00 PM|16:00/i })).toBeTruthy();
    expect(
      screen.queryByRole("heading", {
        name: formatBookingSlotDateHeading(dayB, timeZone),
      }),
    ).not.toBeInTheDocument();
  });

  it("offers a jump when the selected day has no times", async () => {
    const user = userEvent.setup({ delay: null });
    const jumped: number[] = [];
    render(
      <PublicBookingSlotPicker
        slots={slots}
        selectedDateKey="2026-08-18"
        guestTimeZone={timeZone}
        selectedSlotStart={null}
        onSelectSlot={() => {}}
        onJumpToNextAvailable={() => {
          jumped.push(1);
        }}
      />,
    );

    expect(screen.getByText("No open times on this day.")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Jump to next available day" }),
    );
    expect(jumped).toHaveLength(1);
  });

  it("offers a jump when the month has no open days", () => {
    render(
      <PublicBookingSlotPicker
        slots={[]}
        selectedDateKey={null}
        guestTimeZone={timeZone}
        selectedSlotStart={null}
        onSelectSlot={() => {}}
        onJumpToNextAvailable={() => {}}
      />,
    );

    expect(screen.getByText("No open times this month.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Jump to next available day" }),
    ).toBeInTheDocument();
  });
});
