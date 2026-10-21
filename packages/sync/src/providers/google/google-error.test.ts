import {
  googleErrorReasons,
  hasGoogleRateLimitReason,
} from "@sync/providers/google/google-error";
import { describe, expect, it } from "bun:test";

describe("googleErrorReasons", () => {
  it("reads reasons from the response body and the error object", () => {
    expect(
      googleErrorReasons({
        response: { data: { error: { errors: [{ reason: "badRequest" }] } } },
        errors: [{ reason: "rateLimitExceeded" }],
      }),
    ).toEqual(["badRequest", "rateLimitExceeded"]);
  });
});

describe("hasGoogleRateLimitReason", () => {
  it("treats quota reasons as retryable even when they sit on the error object", () => {
    expect(
      hasGoogleRateLimitReason({
        errors: [{ reason: "rateLimitExceeded" }],
      }),
    ).toBe(true);
    expect(
      hasGoogleRateLimitReason({
        response: { data: { error: { errors: [{ reason: "forbidden" }] } } },
      }),
    ).toBe(false);
  });
});
