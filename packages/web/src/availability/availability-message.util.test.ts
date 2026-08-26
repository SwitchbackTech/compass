import {
  EMPTY_AVAILABILITY_MESSAGE,
  formatAvailabilityMessage,
} from "./availability-message.util";
import { type AvailabilitySlot } from "./availability-slot.util";
import { describe, expect, it } from "bun:test";

const slot = (start: string, end: string): AvailabilitySlot => ({
  id: `${start}/${end}`,
  start,
  end,
  selected: true,
  origin: "suggested",
});

describe("formatAvailabilityMessage", () => {
  it("returns the placeholder for an empty selection", () => {
    expect(
      formatAvailabilityMessage({
        slots: [],
        sourceTimeZone: "America/Denver",
      }),
    ).toBe(EMPTY_AVAILABILITY_MESSAGE);
  });

  it("merges adjacent slots and omits the redundant per-bullet zone", () => {
    expect(
      formatAvailabilityMessage({
        slots: [
          slot("2026-08-27T16:00:00.000Z", "2026-08-27T16:30:00.000Z"),
          slot("2026-08-27T16:30:00.000Z", "2026-08-27T17:00:00.000Z"),
          slot("2026-08-27T20:00:00.000Z", "2026-08-27T20:30:00.000Z"),
        ],
        sourceTimeZone: "America/Denver",
        now: new Date("2026-06-01T00:00:00Z"),
        hourCycle: "h12",
      }),
    ).toBe(
      "Do any of these times (MDT) work for you?\n\nAugust 27 (Thursday):\n- 10:00am–11:00am\n- 2:00pm–2:30pm",
    );
  });

  it("formats a recipient zone and prefixes its differing date", () => {
    expect(
      formatAvailabilityMessage({
        slots: [slot("2026-03-07T06:30:00.000Z", "2026-03-07T07:00:00.000Z")],
        sourceTimeZone: "America/Denver",
        recipientTimeZone: "Europe/London",
        now: new Date("2026-03-01T00:00:00Z"),
        hourCycle: "h12",
      }),
    ).toContain("- 11:30pm–12:00am (MST) / Mar 7, 6:30am–7:00am (GMT)");
  });

  it("keeps the per-bullet zone when a recipient zone is present", () => {
    expect(
      formatAvailabilityMessage({
        slots: [slot("2026-08-27T16:00:00.000Z", "2026-08-27T16:30:00.000Z")],
        sourceTimeZone: "America/Denver",
        recipientTimeZone: "Europe/London",
        now: new Date("2026-06-01T00:00:00Z"),
        hourCycle: "h12",
      }),
    ).toContain("- 10:00am–10:30am (MDT) / 5:00pm–5:30pm (");
  });

  it("uses compact zone labels when selected intervals span DST abbreviations", () => {
    const output = formatAvailabilityMessage({
      slots: [
        slot("2026-03-06T17:00:00Z", "2026-03-06T17:30:00Z"),
        slot("2026-03-09T16:00:00Z", "2026-03-09T16:30:00Z"),
      ],
      sourceTimeZone: "America/Denver",
      now: new Date("2026-03-01T00:00:00Z"),
      hourCycle: "h23",
    });
    expect(
      output.startsWith("Do any of these times (Denver) work for you?"),
    ).toBe(true);
    expect(output).toContain("(MST)");
    expect(output).toContain("(MDT)");
  });
});
