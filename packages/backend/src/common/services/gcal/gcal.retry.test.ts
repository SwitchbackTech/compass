import { GaxiosError, type GaxiosResponse } from "gaxios";
import {
  computeBackoffDelayMs,
  isRetryableGoogleError,
  withGoogleRetry,
} from "@backend/common/services/gcal/gcal.retry";

const makeGaxiosError = ({
  status,
  reasons,
  noResponse = false,
}: {
  status?: number;
  reasons?: string[];
  noResponse?: boolean;
}): GaxiosError => {
  const err = new GaxiosError(
    "Gcal request failed",
    { headers: new Headers(), url: new URL("https://example.com") },
    noResponse
      ? undefined
      : ({
          status,
          statusText: "",
          headers: new Headers(),
          config: {
            headers: new Headers(),
            url: new URL("https://example.com"),
          },
          // GaxiosError's constructor only preserves `data` when the
          // response looks like it came from a real fetch Response (i.e.
          // `bodyUsed` is truthy) — otherwise it discards it via
          // translateData(responseType, undefined).
          bodyUsed: true,
          data: {
            error: {
              errors: (reasons ?? []).map((reason) => ({ reason })),
            },
          },
        } as unknown as GaxiosResponse),
  );

  return err;
};

describe("isRetryableGoogleError", () => {
  it("retries on 429", () => {
    expect(isRetryableGoogleError(makeGaxiosError({ status: 429 }))).toBe(true);
  });

  it.each([
    "rateLimitExceeded",
    "userRateLimitExceeded",
    "quotaExceeded",
    "dailyLimitExceeded",
  ])("retries on 403 with reason %s", (reason) => {
    expect(
      isRetryableGoogleError(
        makeGaxiosError({ status: 403, reasons: [reason] }),
      ),
    ).toBe(true);
  });

  it("does not retry on 403 with an unrelated reason", () => {
    expect(
      isRetryableGoogleError(
        makeGaxiosError({ status: 403, reasons: ["forbidden"] }),
      ),
    ).toBe(false);
  });

  it.each([500, 502, 503, 504])("retries on %d", (status) => {
    expect(isRetryableGoogleError(makeGaxiosError({ status }))).toBe(true);
  });

  it.each([400, 401, 404, 410])("does not retry on %d", (status) => {
    expect(isRetryableGoogleError(makeGaxiosError({ status }))).toBe(false);
  });

  it("retries when there is no response at all (network-level failure)", () => {
    expect(isRetryableGoogleError(makeGaxiosError({ noResponse: true }))).toBe(
      true,
    );
  });

  it.each([
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ENOTFOUND",
    "EAI_AGAIN",
  ])("retries plain network errors with code %s", (code) => {
    expect(
      isRetryableGoogleError(Object.assign(new Error("boom"), { code })),
    ).toBe(true);
  });

  it("does not retry a plain validation error", () => {
    expect(isRetryableGoogleError(new Error("Invalid Value"))).toBe(false);
  });

  it("does not retry undefined/null", () => {
    expect(isRetryableGoogleError(undefined)).toBe(false);
    expect(isRetryableGoogleError(null)).toBe(false);
  });
});

describe("computeBackoffDelayMs", () => {
  it("produces increasing caps that saturate at maxDelayMs", () => {
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(1);

    const delays = [0, 1, 2, 3, 4, 5, 6, 10].map((attempt) =>
      computeBackoffDelayMs(attempt, { baseDelayMs: 500, maxDelayMs: 30_000 }),
    );

    expect(delays).toEqual([500, 1000, 2000, 4000, 8000, 16000, 30000, 30000]);

    randomSpy.mockRestore();
  });

  it("jitters within [0, cap]", () => {
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

    const delay = computeBackoffDelayMs(2, {
      baseDelayMs: 500,
      maxDelayMs: 30_000,
    });

    expect(delay).toBe(1000);

    randomSpy.mockRestore();
  });
});

describe("withGoogleRetry", () => {
  const noopSleep = async () => undefined;

  it("resolves immediately on success without sleeping", async () => {
    const sleep = jest.fn(noopSleep);
    const fn = jest.fn().mockResolvedValue("ok");

    await expect(withGoogleRetry(fn, { sleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries a retryable failure and resolves once it succeeds", async () => {
    const sleep = jest.fn(noopSleep);
    const fn = jest
      .fn()
      .mockRejectedValueOnce(makeGaxiosError({ status: 429 }))
      .mockRejectedValueOnce(makeGaxiosError({ status: 500 }))
      .mockResolvedValueOnce("ok");

    await expect(withGoogleRetry(fn, { sleep, maxAttempts: 5 })).resolves.toBe(
      "ok",
    );
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("throws immediately on a non-retryable error without sleeping", async () => {
    const sleep = jest.fn(noopSleep);
    const err = makeGaxiosError({ status: 404 });
    const fn = jest.fn().mockRejectedValue(err);

    await expect(withGoogleRetry(fn, { sleep })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("throws the original error once maxAttempts is exhausted", async () => {
    const sleep = jest.fn(noopSleep);
    const err = makeGaxiosError({ status: 429 });
    const fn = jest.fn().mockRejectedValue(err);

    await expect(withGoogleRetry(fn, { sleep, maxAttempts: 3 })).rejects.toBe(
      err,
    );
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
