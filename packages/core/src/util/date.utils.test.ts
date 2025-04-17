import { convertRfc5545ToIso, convertToRfc5545 } from "./date.utils";

describe("convertRfc5545ToIso", () => {
  it("parses RFC5545 iCalendar dates with Z suffix", () => {
    const utcDate = convertRfc5545ToIso("20251207T155933Z");
    expect(utcDate).toEqual("2025-12-07T15:59:33.000Z"); // UTC
  });

  it("parses RFC5545 iCalendar dates without Z suffix", () => {
    const localDate = convertRfc5545ToIso("20251207T155933");
    expect(localDate).toEqual("2025-12-07T15:59:33.000Z");
  });

  it("returns null for invalid dates", () => {
    const date = convertRfc5545ToIso("invalid");
    expect(date).toBeNull();
  });
});

describe("convertToRfc5545", () => {
  it("converts ISO string to RFC5545 iCalendar format", () => {
    const rfc5545 = convertToRfc5545("2025-12-07T15:59:33.000Z");
    expect(rfc5545).toEqual("20251207T155933Z");
  });

  it("returns null for invalid dates", () => {
    const date = convertToRfc5545("invalid");
    expect(date).toBeNull();
  });
});
