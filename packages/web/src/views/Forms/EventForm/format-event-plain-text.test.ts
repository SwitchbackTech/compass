import { htmlToPlainText } from "@web/common/utils/html/html-to-plain-text.util";
import { timedGridSchedule } from "@web/events/grid-event-draft.adapter";
import { formatEventPlainText } from "@web/views/Forms/EventForm/format-event-plain-text";
import { describe, expect, it } from "bun:test";

describe("formatEventPlainText", () => {
  it("formats title, schedule, location, attendees, and description", () => {
    const schedule = timedGridSchedule(
      new Date("2026-03-10T15:00:00.000Z"),
      new Date("2026-03-10T16:00:00.000Z"),
    );

    const text = formatEventPlainText({
      title: "Design review",
      schedule,
      location: "Room 4",
      description: "<p>Bring mocks</p>",
      attendees: [{ email: "alex@example.com", displayName: "Alex" }],
      calendarName: "Work",
    });

    expect(text).toContain("Design review");
    expect(text).toContain("Location: Room 4");
    expect(text).toContain("Calendar: Work");
    expect(text).toContain("Alex <alex@example.com>");
    expect(text).toContain("Bring mocks");
  });
});

describe("htmlToPlainText", () => {
  it("strips markup", () => {
    expect(htmlToPlainText("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world",
    );
  });
});
