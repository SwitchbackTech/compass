import tinycolor from "tinycolor2";
import { brighten, isDark } from "@web/common/styles/color.utils";
import { EVENT_COLOR_SLOT_HEX } from "@web/common/styles/theme.util";
import {
  PAST_EVENT_DARKEN_LIGHT_FILL,
  PAST_EVENT_INK_DESATURATE,
  PAST_EVENT_INK_MIX_PERCENT,
  pastEventFill,
} from "@web/grid/components/grid-event-card-shell";
import { describe, expect, it } from "bun:test";

const SAMPLE_FILLS = [
  "#454442",
  "#82A0B2",
  ...Object.values(EVENT_COLOR_SLOT_HEX),
];

describe("pastEventFill", () => {
  it("exports stable mute steps for tests and docs", () => {
    expect(PAST_EVENT_INK_MIX_PERCENT).toBeGreaterThan(0);
    expect(PAST_EVENT_INK_DESATURATE).toBeGreaterThan(0);
    expect(PAST_EVENT_DARKEN_LIGHT_FILL).toBeGreaterThan(0);
  });

  it("always lowers lightness versus the upcoming fill", () => {
    for (const fill of SAMPLE_FILLS) {
      const original = tinycolor(fill);
      const muted = tinycolor(pastEventFill(fill));
      expect(muted.toHsl().l).toBeLessThan(original.toHsl().l);
    }
  });

  it("darkens ink-like fills instead of the previous brighten step", () => {
    const inkFills = Object.values(EVENT_COLOR_SLOT_HEX).filter((fill) =>
      isDark(fill),
    );
    expect(inkFills.length).toBeGreaterThan(0);
    for (const fill of inkFills) {
      const past = pastEventFill(fill);
      const legacyPast = brighten(fill, 14);
      expect(tinycolor(past).toHsl().l).toBeLessThan(tinycolor(fill).toHsl().l);
      expect(tinycolor(past).toHsl().l).toBeLessThan(
        tinycolor(legacyPast).toHsl().l,
      );
    }
  });

  it("stays darker than the upcoming fill for saturated blues (light grid)", () => {
    const upcoming = EVENT_COLOR_SLOT_HEX.blue;
    const past = pastEventFill(upcoming);
    expect(tinycolor(past).toHsl().l).toBeLessThan(
      tinycolor(upcoming).toHsl().l,
    );
  });
});
