import { occupancyFactsForEvent } from "@sync/domain/booking-occupancy-facts";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { describe, expect, it } from "bun:test";

const event = (overrides: Partial<EventRecord["content"]> = {}): EventRecord =>
  ({
    content: {
      title: "Busy",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
      ...overrides,
    },
  }) as EventRecord;

describe("occupancyFactsForEvent", () => {
  it("treats a missing event as host-organized", () => {
    expect(occupancyFactsForEvent(undefined, "host@example.com")).toEqual({
      hostIsOrganizer: true,
      hostResponseStatus: null,
    });
  });

  it("treats a Compass-created event with no organizer as host-organized", () => {
    expect(occupancyFactsForEvent(event(), "host@example.com")).toEqual({
      hostIsOrganizer: true,
      hostResponseStatus: null,
    });
  });

  it("matches the organizer email case-insensitively", () => {
    expect(
      occupancyFactsForEvent(
        event({
          organizer: { email: "Host@Example.com", displayName: "Host" },
        }),
        "host@example.com",
      ),
    ).toEqual({ hostIsOrganizer: true, hostResponseStatus: null });
  });

  it("reads the host attendee response when the host is not the organizer", () => {
    expect(
      occupancyFactsForEvent(
        event({
          organizer: { email: "other@example.com", displayName: "Other" },
          attendees: [
            {
              email: "HOST@example.com",
              displayName: "Host",
              responseStatus: "needsAction",
            },
          ],
        }),
        "host@example.com",
      ),
    ).toEqual({
      hostIsOrganizer: false,
      hostResponseStatus: "needsAction",
    });
  });

  it("reads an accepted invite when the host is not the organizer", () => {
    expect(
      occupancyFactsForEvent(
        event({
          organizer: { email: "other@example.com", displayName: "Other" },
          attendees: [
            {
              email: "host@example.com",
              displayName: "Host",
              responseStatus: "accepted",
            },
          ],
        }),
        "host@example.com",
      ),
    ).toEqual({
      hostIsOrganizer: false,
      hostResponseStatus: "accepted",
    });
  });
});
