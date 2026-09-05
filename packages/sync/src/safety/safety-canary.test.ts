import { findSafetyCanaryHit, PROVIDER_LEAK_MARKERS } from "./safety-canary";
import { describe, expect, it } from "bun:test";

const PROVIDER_MARKER_SAMPLES: Record<
  keyof typeof PROVIDER_LEAK_MARKERS,
  unknown[]
> = {
  google: [
    { conferenceData: {} },
    { hangoutLink: "https://meet.example.com/abc" },
  ],
  microsoft: [
    { "@odata.etag": 'W/"abc"' },
    { onlineMeeting: { joinUrl: "https://teams.example.com/join" } },
    { seriesMasterId: "series-master-id" },
  ],
  apple: [
    "BEGIN:VEVENT\nUID:1\nEND:VEVENT",
    "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR",
  ],
};

describe("SECRET_PATTERNS", () => {
  it("trips the canary for the Apple app-password fixture", () => {
    expect(findSafetyCanaryHit("apple-app-password-fixture")).toMatch(
      /^secret:/,
    );
  });
});

describe("PROVIDER_LEAK_MARKERS", () => {
  it("trips the canary for a marker from every registered provider", () => {
    for (const [provider, patterns] of Object.entries(PROVIDER_LEAK_MARKERS)) {
      expect(patterns.length).toBeGreaterThan(0);
      const samples =
        PROVIDER_MARKER_SAMPLES[provider as keyof typeof PROVIDER_LEAK_MARKERS];
      expect(samples.length).toBeGreaterThanOrEqual(patterns.length);
      for (let index = 0; index < patterns.length; index += 1) {
        const pattern = patterns[index]!;
        const sample = samples[index]!;
        expect(findSafetyCanaryHit(sample)).toMatch(/^eventContent:/);
        expect(pattern.test(JSON.stringify(sample))).toBe(true);
      }
    }
  });
});
