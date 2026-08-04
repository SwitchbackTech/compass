import {
  calendarAccentAccessibleSuffix,
  calendarAccentStyle,
} from "./calendar-accent.util";
import { describe, expect, it } from "bun:test";

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
