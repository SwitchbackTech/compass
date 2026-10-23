import { renderBookingHostEmail } from "@backend/email/booking-host-email.content";
import { describe, expect, it } from "bun:test";

describe("renderBookingHostEmail", () => {
  const base = {
    guestName: "Alex Guest",
    guestEmail: "alex@example.com",
    notes: "Bring questions",
    durationMinutes: 30,
    pageTimeZone: "America/Los_Angeles",
    guestTimeZone: "America/New_York",
    slotStart: new Date("2026-10-24T17:00:00.000Z"),
    slotEnd: new Date("2026-10-24T17:30:00.000Z"),
    conference: "meet" as const,
    openInCompassUrl: "https://app.compasscalendar.com/week/2026-10-24",
    unsubscribe: {
      httpsUrl:
        "https://api.example.com/api/email/unsubscribe?token=abc&scope=booking-host",
      listUnsubscribeHeader: "<mailto:unsubscribe@mail.compasscalendar.com>",
    },
  };

  it("renders booked, cancelled, and rescheduled variants with guest and host times", () => {
    for (const kind of ["booked", "cancelled", "rescheduled"] as const) {
      const rendered = renderBookingHostEmail({
        ...base,
        kind,
        previousSlotStart:
          kind === "rescheduled"
            ? new Date("2026-10-23T17:00:00.000Z")
            : undefined,
      });
      expect(rendered.subject.length).toBeGreaterThan(0);
      expect(rendered.html).toContain("Alex Guest");
      expect(rendered.html).toContain("America/New_York");
      expect(rendered.html).toContain("America/Los_Angeles");
      expect(rendered.text).toContain("Open in Compass");
      expect(rendered.html).toContain("Turn off booking alert emails");
    }
  });
});
