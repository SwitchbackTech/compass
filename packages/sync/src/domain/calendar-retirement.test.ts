import { isEventsCalendarNotFoundDetail } from "@sync/domain/calendar-retirement";
import { describe, expect, it } from "bun:test";

describe("isEventsCalendarNotFoundDetail", () => {
  it("matches Google calendar events notFound failures", () => {
    expect(
      isEventsCalendarNotFoundDetail("Not Found (HTTP 404, reason notFound)"),
    ).toBe(true);
  });

  it("does not match other durable read failures", () => {
    expect(
      isEventsCalendarNotFoundDetail(
        "The user must be signed up for Google Calendar. (HTTP 403, reason notACalendarUser)",
      ),
    ).toBe(false);
  });
});
