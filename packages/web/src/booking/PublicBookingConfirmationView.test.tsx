import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicBookingConfirmationView } from "@web/booking/PublicBookingConfirmationView";
import {
  formatBookingSlotLabel,
  formatDurationMinutes,
} from "@web/booking/public-booking.format";
import { describe, expect, it, mock } from "bun:test";

const slotStart = "2026-09-15T15:00:00.000Z";
const timeZone = "UTC";
const cancelUrl =
  "https://compasscalendar.com/meet/cancel/000000000000000000000099?token=abc";
const rescheduleUrl =
  "https://compasscalendar.com/meet/reschedule/000000000000000000000099?token=abc";

describe("PublicBookingConfirmationView", () => {
  it("shows the slot summary instead of a raw cancel URL", () => {
    render(
      <PublicBookingConfirmationView
        cancelUrl={cancelUrl}
        durationMinutes={30}
        hostDisplayName="Tyler Dane"
        guestName="Ada Lovelace"
        notes={null}
        slotStart={slotStart}
        timeZone={timeZone}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "You are booked with Tyler Dane" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    expect(screen.getByText("When")).toBeInTheDocument();
    expect(
      screen.getByText(formatBookingSlotLabel(slotStart, timeZone)),
    ).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText(formatDurationMinutes(30))).toBeInTheDocument();
    expect(screen.getByText("Timezone")).toBeInTheDocument();
    expect(screen.queryByText(cancelUrl)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Cancel this booking" }),
    ).toHaveAttribute("href", cancelUrl);
    expect(
      screen.getByRole("button", { name: "Copy cancel link" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy reschedule link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("A Google Meet invite is on its way to your email."),
    ).toBeInTheDocument();
  });

  it("shows cancel then reschedule actions when both URLs are present", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <PublicBookingConfirmationView
        cancelUrl={cancelUrl}
        rescheduleUrl={rescheduleUrl}
        durationMinutes={30}
        hostDisplayName="Tyler Dane"
        guestName="Ada Lovelace"
        notes={null}
        slotStart={slotStart}
        timeZone={timeZone}
      />,
    );

    const heading = screen.getByRole("heading", {
      name: "You are booked with Tyler Dane",
    });
    expect(screen.queryByText(rescheduleUrl)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Reschedule this booking" }),
    ).toHaveAttribute("href", rescheduleUrl);
    expect(
      screen.getByRole("button", { name: "Copy reschedule link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Booking actions" }),
    ).toBeInTheDocument();

    heading.focus();
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Copy cancel link" }),
    ).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("link", { name: "Cancel this booking" }),
    ).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Copy reschedule link" }),
    ).toHaveFocus();
  });

  it("promises a calendar invite when the destination cannot mint Meet", () => {
    render(
      <PublicBookingConfirmationView
        cancelUrl={cancelUrl}
        createsGoogleMeet={false}
        durationMinutes={30}
        hostDisplayName="Tyler Dane"
        guestName="Ada Lovelace"
        notes={null}
        slotStart={slotStart}
        timeZone={timeZone}
      />,
    );

    expect(
      screen.getByText("The calendar invite is on its way to your email."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("A Google Meet invite is on its way to your email."),
    ).not.toBeInTheDocument();
  });

  it("promises a Teams invite when the destination conference is teams", () => {
    render(
      <PublicBookingConfirmationView
        cancelUrl={cancelUrl}
        conference="teams"
        durationMinutes={30}
        hostDisplayName="Tyler Dane"
        guestName="Ada Lovelace"
        notes={null}
        slotStart={slotStart}
        timeZone={timeZone}
      />,
    );

    expect(
      screen.getByText("A Microsoft Teams invite is on its way to your email."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("A Google Meet invite is on its way to your email."),
    ).not.toBeInTheDocument();
  });

  it("promises a calendar invite when the destination conference is none", () => {
    render(
      <PublicBookingConfirmationView
        cancelUrl={cancelUrl}
        conference="none"
        durationMinutes={30}
        hostDisplayName="Tyler Dane"
        guestName="Ada Lovelace"
        notes={null}
        slotStart={slotStart}
        timeZone={timeZone}
      />,
    );

    expect(
      screen.getByText("The calendar invite is on its way to your email."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("A Google Meet invite is on its way to your email."),
    ).not.toBeInTheDocument();
  });

  it("hides copy and cancel controls without a cancel URL", () => {
    render(
      <PublicBookingConfirmationView
        durationMinutes={30}
        hostDisplayName="Tyler Dane"
        guestName="Ada Lovelace"
        notes={null}
        slotStart={slotStart}
        timeZone={timeZone}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Copy cancel link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy reschedule link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "cancel this booking" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Cancel this booking" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Reschedule this booking" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("A Google Meet invite is on its way to your email."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/To cancel, use the link in that invite/),
    ).not.toBeInTheDocument();
  });

  it("copies the cancel URL from the secondary button", async () => {
    const user = userEvent.setup({ delay: null });
    const written: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mock((value: string) => {
          written.push(value);
          return Promise.resolve();
        }),
      },
    });

    render(
      <PublicBookingConfirmationView
        cancelUrl={cancelUrl}
        durationMinutes={30}
        hostDisplayName="Tyler Dane"
        guestName="Ada Lovelace"
        notes={null}
        slotStart={slotStart}
        timeZone={timeZone}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Copy cancel link" }));

    expect(written).toEqual([cancelUrl]);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
  });

  it("copies the reschedule URL from the secondary button", async () => {
    const user = userEvent.setup({ delay: null });
    const written: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mock((value: string) => {
          written.push(value);
          return Promise.resolve();
        }),
      },
    });

    render(
      <PublicBookingConfirmationView
        cancelUrl={cancelUrl}
        rescheduleUrl={rescheduleUrl}
        durationMinutes={30}
        hostDisplayName="Tyler Dane"
        guestName="Ada Lovelace"
        notes={null}
        slotStart={slotStart}
        timeZone={timeZone}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Copy reschedule link" }),
    );

    expect(written).toEqual([rescheduleUrl]);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy cancel link" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
  });

  it("shows notes and Edit details when provided", async () => {
    const user = userEvent.setup({ delay: null });
    const onEditDetails = mock(() => undefined);
    render(
      <PublicBookingConfirmationView
        cancelUrl={cancelUrl}
        durationMinutes={30}
        hostDisplayName="Tyler Dane"
        guestName="Ada Lovelace"
        notes="bring coffee"
        onEditDetails={onEditDetails}
        slotStart={slotStart}
        timeZone={timeZone}
      />,
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("bring coffee")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit details" }));
    expect(onEditDetails).toHaveBeenCalledTimes(1);
  });

  it("hides Edit details without an edit handler", () => {
    render(
      <PublicBookingConfirmationView
        durationMinutes={30}
        hostDisplayName="Tyler Dane"
        guestName="Ada Lovelace"
        notes={null}
        slotStart={slotStart}
        timeZone={timeZone}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Edit details" }),
    ).not.toBeInTheDocument();
  });
});
