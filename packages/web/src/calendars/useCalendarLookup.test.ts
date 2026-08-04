import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  buildCalendarLookup,
  calendarAccentAccessibleSuffix,
  calendarAccentStyle,
  findCrossAccountDuplicate,
  resolveCalendarCardIdentity,
} from "./useCalendarLookup";
import { describe, expect, it } from "bun:test";

const calendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Work",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "owner",
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: false,
  isVisible: true,
  isActive: true,
  ...overrides,
});

describe("resolveCalendarCardIdentity", () => {
  it("returns null with only one calendar (nothing to distinguish)", () => {
    const solo = calendar();
    const lookup = buildCalendarLookup([solo]);

    expect(resolveCalendarCardIdentity(lookup, solo.id)).toBeNull();
  });

  it("returns the calendar's name and color with two or more calendars", () => {
    const work = calendar({ name: "Work", backgroundColor: "#3b82f6" });
    const personal = calendar({ name: "Personal" });
    const lookup = buildCalendarLookup([work, personal]);

    expect(resolveCalendarCardIdentity(lookup, work.id)).toEqual({
      name: "Work",
      backgroundColor: "#3b82f6",
    });
  });

  it("carries the cross-account duplicate through when given one", () => {
    const work = calendar({ name: "Work" });
    const personal = calendar({ name: "Personal" });
    const lookup = buildCalendarLookup([work, personal]);
    const duplicate = {
      accountEmail: "ahab@gmail.com",
      backgroundColor: "#ef4444",
    };

    expect(resolveCalendarCardIdentity(lookup, work.id, duplicate)).toEqual({
      name: "Work",
      backgroundColor: work.backgroundColor,
      otherAccount: duplicate,
    });
  });

  it("returns null for a calendarId not in the lookup", () => {
    const work = calendar();
    const personal = calendar();
    const lookup = buildCalendarLookup([work, personal]);
    const missing = CalendarIdSchema.parse(createObjectIdString());

    expect(resolveCalendarCardIdentity(lookup, missing)).toBeNull();
  });
});

describe("findCrossAccountDuplicate", () => {
  it("returns undefined when duplicates or the event id are absent", () => {
    expect(findCrossAccountDuplicate(undefined, "ev-1")).toBeUndefined();
    expect(findCrossAccountDuplicate(new Map(), undefined)).toBeUndefined();
  });

  it("returns the entry for the given event id", () => {
    const duplicate = {
      accountEmail: "ahab@gmail.com",
      backgroundColor: "#ef4444",
    };
    const duplicates = new Map([["ev-1", duplicate]]);

    expect(findCrossAccountDuplicate(duplicates, "ev-1")).toBe(duplicate);
    expect(findCrossAccountDuplicate(duplicates, "ev-2")).toBeUndefined();
  });
});

describe("calendarAccentStyle", () => {
  it("is a flat fill for an ordinary card", () => {
    expect(
      calendarAccentStyle({ name: "Work", backgroundColor: "#3b82f6" }),
    ).toEqual({ backgroundColor: "#3b82f6" });
  });

  it("is a two-stop gradient into the other account's color for a merged card", () => {
    const style = calendarAccentStyle({
      name: "Work",
      backgroundColor: "#3b82f6",
      otherAccount: {
        accountEmail: "ahab@gmail.com",
        backgroundColor: "#ef4444",
      },
    });

    expect(style).toEqual({
      backgroundImage: "linear-gradient(to bottom, #3b82f6, #ef4444)",
    });
    // A flat fill and a gradient must never both apply - the gradient would
    // render underneath an opaque solid color and never be visible.
    expect(style).not.toHaveProperty("backgroundColor");
  });
});

describe("calendarAccentAccessibleSuffix", () => {
  it("names only the calendar for an ordinary card", () => {
    expect(
      calendarAccentAccessibleSuffix({
        name: "Work",
        backgroundColor: "#3b82f6",
      }),
    ).toBe(", Work calendar");
  });

  it("names the other account too for a merged card", () => {
    expect(
      calendarAccentAccessibleSuffix({
        name: "Work",
        backgroundColor: "#3b82f6",
        otherAccount: {
          accountEmail: "ahab@gmail.com",
          backgroundColor: "#ef4444",
        },
      }),
    ).toBe(", Work calendar, also on ahab@gmail.com");
  });
});
