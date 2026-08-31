import dayjs from "@core/util/date/dayjs";
import {
  buildQuickTimeSlots,
  canQuickTimeBufferGrow,
  quickTimeSequenceForHour,
  quickTimeTargetDay,
  resolveQuickTimeStart,
  timedEventsToBusyIntervals,
} from "@web/shortcuts/quick-time/quick-time.util";
import { describe, expect, it } from "bun:test";

const DAY = dayjs("2026-08-05T00:00:00");
const at = (time: string) => dayjs(`2026-08-05T${time}`);
const resolve = (digits: string, now: string) =>
  resolveQuickTimeStart(digits, at(now), DAY)?.format("HH:mm") ?? null;

describe("resolveQuickTimeStart", () => {
  it("reads a four-digit time on the morning side of the clock", () => {
    expect(resolve("1130", "09:00")).toBe("11:30");
  });

  it("inherits the evening meridiem from the current time", () => {
    expect(resolve("1130", "21:00")).toBe("23:30");
  });

  it("takes a 24-hour hour literally, whatever the time of day", () => {
    expect(resolve("1700", "09:00")).toBe("17:00");
    expect(resolve("1700", "21:00")).toBe("17:00");
  });

  it("expands one and two digits to the top of the hour", () => {
    expect(resolve("9", "08:00")).toBe("09:00");
    expect(resolve("11", "08:00")).toBe("11:00");
  });

  it("lands on the target day, not today", () => {
    const start = resolveQuickTimeStart(
      "1700",
      at("09:00"),
      dayjs("2026-08-09T00:00:00"),
    );

    expect(start?.format("YYYY-MM-DD HH:mm")).toBe("2026-08-09 17:00");
  });

  it("rejects sequences that are not a clock time", () => {
    expect(resolve("99", "09:00")).toBeNull();
    expect(resolve("2599", "09:00")).toBeNull();
    expect(resolve("", "09:00")).toBeNull();
    expect(resolve("11305", "09:00")).toBeNull();
  });
});

describe("canQuickTimeBufferGrow", () => {
  it("stops at four digits, where the buffer commits on its own", () => {
    expect(canQuickTimeBufferGrow("113")).toBe(true);
    expect(canQuickTimeBufferGrow("1130")).toBe(false);
  });
});

describe("quickTimeSequenceForHour", () => {
  it("advertises the 24-hour sequence for a reachable hour", () => {
    expect(quickTimeSequenceForHour(17, at("09:00"), DAY)).toBe("1700");
    expect(quickTimeSequenceForHour(9, at("09:00"), DAY)).toBe("0900");
  });

  it("declines an hour no digits can reach from now", () => {
    // In the evening, meridiem inheritance pulls "0900" to 9 PM, so the
    // morning hour has no sequence of its own.
    expect(quickTimeSequenceForHour(9, at("21:00"), DAY)).toBeNull();
  });
});

describe("quickTimeTargetDay", () => {
  const startOfView = dayjs("2026-08-02T00:00:00");
  const endOfView = dayjs("2026-08-08T23:59:59");

  it("uses today when the view contains it", () => {
    const now = dayjs("2026-08-05T09:00:00");

    expect(
      quickTimeTargetDay(startOfView, endOfView, now).format("YYYY-MM-DD"),
    ).toBe("2026-08-05");
  });

  it("falls back to the first visible day on another week", () => {
    const now = dayjs("2026-09-20T09:00:00");

    expect(
      quickTimeTargetDay(startOfView, endOfView, now).format("YYYY-MM-DD"),
    ).toBe("2026-08-02");
  });
});

describe("buildQuickTimeSlots", () => {
  const now = at("00:30");

  it("offers every open hour of the target day", () => {
    const slots = buildQuickTimeSlots({ busy: [], now, targetDay: DAY });
    const sequences = slots.map((slot) => slot.sequence);

    expect(sequences[0]).toBe("0000");
    expect(sequences.at(-1)).toBe("2300");
    expect(sequences).toContain("0900");
    expect(sequences).toContain("1700");
  });

  it("skips noon in the morning, which no sequence reaches", () => {
    // parseUserTime reads "1200" as 12 AM while the current time is AM (the
    // event form's time field behaves the same way), so noon has no sequence
    // of its own before midday and gets no chip rather than a lying one.
    const morning = buildQuickTimeSlots({ busy: [], now, targetDay: DAY });
    const afternoon = buildQuickTimeSlots({
      busy: [],
      now: at("13:00"),
      targetDay: DAY,
    });

    expect(morning.map((slot) => slot.sequence)).not.toContain("1200");
    expect(afternoon.map((slot) => slot.sequence)).toContain("1200");
  });

  it("drops the hours an event already covers", () => {
    const slots = buildQuickTimeSlots({
      busy: [
        {
          startMs: at("09:30").valueOf(),
          endMs: at("10:15").valueOf(),
        },
      ],
      now,
      targetDay: DAY,
    });

    const sequences = slots.map((slot) => slot.sequence);
    expect(sequences).not.toContain("0900");
    expect(sequences).not.toContain("1000");
    expect(sequences).toContain("0800");
    expect(sequences).toContain("1100");
  });

  it("keeps an hour an event only touches at the boundary", () => {
    const slots = buildQuickTimeSlots({
      busy: [{ startMs: at("10:00").valueOf(), endMs: at("11:00").valueOf() }],
      now,
      targetDay: DAY,
    });

    const sequences = slots.map((slot) => slot.sequence);
    expect(sequences).toContain("0900");
    expect(sequences).not.toContain("1000");
    expect(sequences).toContain("1100");
  });
});

describe("timedEventsToBusyIntervals", () => {
  it("keeps only events that have both ends", () => {
    expect(
      timedEventsToBusyIntervals([
        { startDate: at("09:00").format(), endDate: at("10:00").format() },
        { startDate: at("11:00").format() },
        { endDate: at("12:00").format() },
      ]),
    ).toEqual([
      {
        startMs: at("09:00").valueOf(),
        endMs: at("10:00").valueOf(),
      },
    ]);
  });
});
