import {
  isInternalOrTestEmail,
  isInternalOrTestHostname,
  isNonHumanUserAgent,
} from "@core/analytics/posthog-audience.util";
import { describe, expect, it } from "bun:test";

describe("posthog audience helpers", () => {
  it("flags internal team email domains", () => {
    expect(isInternalOrTestEmail("tyler@keepsoftwaresimple.com")).toBe(true);
    expect(isInternalOrTestEmail("guest@example.com")).toBe(false);
  });

  it("flags local hostnames", () => {
    expect(isInternalOrTestHostname("localhost")).toBe(true);
    expect(isInternalOrTestHostname("127.0.0.1")).toBe(true);
    expect(isInternalOrTestHostname("staging.compasscalendar.com")).toBe(false);
  });

  it("treats common bots and agent browsers as non-human", () => {
    expect(
      isNonHumanUserAgent(
        "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
      ),
    ).toBe(true);
    expect(
      isNonHumanUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0.0.0",
      ),
    ).toBe(true);
    expect(
      isNonHumanUserAgent(
        "Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://anthropic.com)",
      ),
    ).toBe(true);
    expect(
      isNonHumanUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
  });
});
