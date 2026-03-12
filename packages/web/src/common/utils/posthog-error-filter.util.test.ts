import { isIgnorablePostHogException } from "./posthog-error-filter.util";

describe("isIgnorablePostHogException", () => {
  it("returns true for Google popup-close exception noise", () => {
    expect(
      isIgnorablePostHogException({
        event: "$exception",
        properties: {
          $exception_values: ["Popup window closed"],
          $exception_sources: ["/gsi/client"],
        },
      }),
    ).toBe(true);
  });

  it("returns false when popup-close source is not Google GSI", () => {
    expect(
      isIgnorablePostHogException({
        event: "$exception",
        properties: {
          $exception_values: ["Popup window closed"],
          $exception_sources: ["/app/oauth"],
        },
      }),
    ).toBe(false);
  });

  it("returns false for non-popup exception values", () => {
    expect(
      isIgnorablePostHogException({
        event: "$exception",
        properties: {
          $exception_values: ["Network Error"],
          $exception_sources: ["/gsi/client"],
        },
      }),
    ).toBe(false);
  });

  it("returns false for non-exception events", () => {
    expect(
      isIgnorablePostHogException({
        event: "$pageview",
        properties: {
          $exception_values: ["Popup window closed"],
          $exception_sources: ["/gsi/client"],
        },
      }),
    ).toBe(false);
  });
});
