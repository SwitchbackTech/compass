import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const BOOKING_SPEC_PATH = "docs/features/booking.md";

const BOOKING_SUPPORT_DOC_PATHS = [
  "docs/architecture/glossary.md",
  "docs/development/feature-file-map.md",
  "docs/acceptance/shortcuts.md",
  "docs/frontend/shortcut-commandments.md",
] as const;

/** Stale v1.8 product terms; word boundaries avoid "module" and "buffering". */
const STALE_BOOKING_TERMS =
  /\b(?:BookingAddressSetup|BookingLimitsFieldset|weekly-hours\.parse|9-12,\s*1-5|buffer|max meetings per day|welcome text|invite others)\b/i;

const STALE_MEETING_MOD_CHORDS = /\bMod\+(?:[4-9]|U)\b/;

const REMOVED_IN_V18 = /removed in Booking v1\.8/i;

function lineAllowedInBookingSpec(line: string, nearby: string[]): boolean {
  if (REMOVED_IN_V18.test(line)) return true;
  if (nearby.some((other) => REMOVED_IN_V18.test(other))) return true;
  return false;
}

function staleLines(
  content: string,
  options: {
    includeMeetingModChords: boolean;
    allowV18RemovalBlock?: boolean;
  },
): string[] {
  const lines = content.split("\n");
  return lines.flatMap((line, index) => {
    const matchesStaleTerm = STALE_BOOKING_TERMS.test(line);
    const matchesMeetingMod =
      options.includeMeetingModChords && STALE_MEETING_MOD_CHORDS.test(line);
    if (!matchesStaleTerm && !matchesMeetingMod) return [];

    if (options.allowV18RemovalBlock) {
      const nearby = lines.slice(Math.max(0, index - 2), index + 3);
      if (lineAllowedInBookingSpec(line, nearby)) return [];
    }

    return [`${index + 1}: ${line.trim()}`];
  });
}

describe("booking v1.8 doc drift", () => {
  it("docs/features/booking.md has no stale terms outside the v1.8 removal wart", () => {
    const content = readFileSync(BOOKING_SPEC_PATH, "utf8");
    expect(
      staleLines(content, {
        includeMeetingModChords: true,
        allowV18RemovalBlock: true,
      }),
    ).toEqual([]);
  });

  for (const path of BOOKING_SUPPORT_DOC_PATHS) {
    it(`${path} has no stale booking file references or Meeting Mod chords`, () => {
      const content = readFileSync(path, "utf8");
      expect(
        staleLines(content, {
          includeMeetingModChords: false,
        }),
      ).toEqual([]);
    });
  }
});
