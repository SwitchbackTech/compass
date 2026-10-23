import { withGoogleApiRetry } from "@sync/providers/google/google-api-retry";
import { describe, expect, it, mock } from "bun:test";

describe("withGoogleApiRetry", () => {
  it("retries a 429 when Retry-After is present", async () => {
    const sleep = mock(() => Promise.resolve());
    const operation = mock(() => {
      if (operation.mock.calls.length < 2) {
        return Promise.reject(
          Object.assign(new Error("rateLimitExceeded"), {
            response: {
              status: 429,
              headers: { "retry-after": "0" },
            },
          }),
        );
      }
      return Promise.resolve("done");
    });

    await expect(withGoogleApiRetry(operation, { sleep })).resolves.toBe(
      "done",
    );
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
