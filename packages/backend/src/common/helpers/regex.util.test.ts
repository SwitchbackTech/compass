import { cleanRegex } from "./regex.util";

describe("cleanRegex", () => {
  it("should escape all regex special characters", () => {
    const testCases = [
      { input: "test@gmail.com", expected: "test@gmail\\.com" },
      { input: "test@gmail.com.*", expected: "test@gmail\\.com\\.\\*" },
      { input: "test@gmail.com+", expected: "test@gmail\\.com\\+" },
      { input: "test@gmail.com?", expected: "test@gmail\\.com\\?" },
      { input: "test@gmail.com^", expected: "test@gmail\\.com\\^" },
      { input: "test@gmail.com$", expected: "test@gmail\\.com\\$" },
      { input: "test@gmail.com{", expected: "test@gmail\\.com\\{" },
      { input: "test@gmail.com}", expected: "test@gmail\\.com\\}" },
      { input: "test@gmail.com(", expected: "test@gmail\\.com\\(" },
      { input: "test@gmail.com)", expected: "test@gmail\\.com\\)" },
      { input: "test@gmail.com|", expected: "test@gmail\\.com\\|" },
      { input: "test@gmail.com[", expected: "test@gmail\\.com\\[" },
      { input: "test@gmail.com]", expected: "test@gmail\\.com\\]" },
      { input: "test@gmail.com\\", expected: "test@gmail\\.com\\\\" },
    ];

    testCases.forEach(({ input, expected }) => {
      expect(cleanRegex(input)).toBe(expected);
    });
  });

  it("should handle multiple special characters in the same string", () => {
    const input = "test.*+?^${}()|[]\\@gmail.com";
    const expected =
      "test\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\@gmail\\.com";

    expect(cleanRegex(input)).toBe(expected);
  });

  it("should handle empty string", () => {
    expect(cleanRegex("")).toBe("");
  });

  it("should handle string with no special characters", () => {
    const input = "simpleemail@gmail.com";
    const expected = "simpleemail@gmail\\.com";

    expect(cleanRegex(input)).toBe(expected);
  });

  it("should handle string with only special characters", () => {
    const input = ".*+?^${}()|[]\\";
    const expected = "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\";

    expect(cleanRegex(input)).toBe(expected);
  });

  it("should handle case variations safely", () => {
    const testCases = [
      "FooBar@gmail.com",
      "foobar@gmail.com",
      "FOOBAR@GMAIL.COM",
      "FooBar@Gmail.com",
    ];

    testCases.forEach((email) => {
      const escaped = cleanRegex(email);
      // Should escape the dots in the email
      expect(escaped).toContain("\\.");
      // Verify that the escaped string can be safely used in a regex
      const regex = new RegExp(`^${escaped}$`, "i");
      expect(regex.test(email)).toBe(true);
    });
  });

  it("should prevent regex injection attacks", () => {
    // Test that malicious regex patterns are properly escaped
    const maliciousInputs = [
      "test@gmail.com.*",
      "test@gmail.com+",
      "test@gmail.com?",
      "test@gmail.com^",
      "test@gmail.com$",
      "test@gmail.com{",
      "test@gmail.com}",
      "test@gmail.com(",
      "test@gmail.com)",
      "test@gmail.com|",
      "test@gmail.com[",
      "test@gmail.com]",
      "test@gmail.com\\",
    ];

    maliciousInputs.forEach((input) => {
      const escaped = cleanRegex(input);
      // Verify that the escaped string can be safely used in a regex
      const regex = new RegExp(`^${escaped}$`, "i");

      // Should match the original input
      expect(regex.test(input)).toBe(true);

      // Should not match a different string
      expect(regex.test("different@gmail.com")).toBe(false);
    });
  });
});
