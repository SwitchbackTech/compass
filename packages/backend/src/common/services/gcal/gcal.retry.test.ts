import { GaxiosError, type GaxiosResponse } from "gaxios";
import { Logger } from "@core/logger/winston.logger";
import {
  computeBackoffDelayMs,
  isRetryableGoogleError,
  withGoogleRetry,
} from "@backend/common/services/gcal/gcal.retry";

// Local override so the retry module's own `logger` instance (captured once
// at import time) is this mock, letting the observability tests below assert
// on it directly instead of the repo-wide no-op logger mock. Babel hoists
// `import`s above any same-file `const`, so the shared mock object is
// defined inside the factory itself (nothing external to dereference too
// early) and recovered afterward from `Logger`'s single recorded call.
jest.mock("@core/logger/winston.logger", () => ({
  Logger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
  })),
}));

const mockLogger = (Logger as unknown as jest.Mock).mock.results[0]?.value as {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  verbose: jest.Mock;
};

const makeGaxiosError = ({
  status,
  reasons,
  noResponse = false,
  headers,
}: {
  status?: number;
  reasons?: string[];
  noResponse?: boolean;
  headers?: Record<string, string>;
}): GaxiosError => {
  const err = new GaxiosError(
    "Gcal request failed",
    { headers: new Headers(), url: new URL("https://example.com") },
    noResponse
      ? undefined
      : ({
          status,
          statusText: "",
          headers: new Headers(headers),
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

describe("withGoogleRetry Retry-After handling", () => {
  const noopSleep = async () => undefined;

  it("uses a Retry-After hint that's shorter than the computed backoff", async () => {
    // random=1 pushes computed backoff to its max (30s for attempt 0 with a
    // 500ms base is still only 500ms, so pick a big base to make sure the
    // hint -- not the backoff -- is what's asserted below).
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(1);
    const sleep = jest.fn(noopSleep);
    const err = makeGaxiosError({
      status: 429,
      headers: { "retry-after": "2" },
    });
    const fn = jest.fn().mockRejectedValueOnce(err).mockResolvedValueOnce("ok");

    await expect(
      withGoogleRetry(fn, { sleep, baseDelayMs: 10_000, maxDelayMs: 30_000 }),
    ).resolves.toBe("ok");

    expect(sleep).toHaveBeenCalledWith(2000);

    randomSpy.mockRestore();
  });

  it("clamps a Retry-After hint larger than maxDelayMs", async () => {
    const sleep = jest.fn(noopSleep);
    const err = makeGaxiosError({
      status: 429,
      headers: { "retry-after": "9999" },
    });
    const fn = jest.fn().mockRejectedValueOnce(err).mockResolvedValueOnce("ok");

    await expect(
      withGoogleRetry(fn, { sleep, maxDelayMs: 30_000 }),
    ).resolves.toBe("ok");

    expect(sleep).toHaveBeenCalledWith(30_000);
  });

  it.each([
    ["absent", undefined],
    ["an HTTP-date", "Wed, 21 Oct 2015 07:28:00 GMT"],
    ["garbage", "soon-ish"],
  ])("falls back to computed backoff when the hint is %s", async (_case, value) => {
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    const sleep = jest.fn(noopSleep);
    const err = makeGaxiosError({
      status: 429,
      headers: value === undefined ? undefined : { "retry-after": value },
    });
    const fn = jest.fn().mockRejectedValueOnce(err).mockResolvedValueOnce("ok");

    await expect(
      withGoogleRetry(fn, { sleep, baseDelayMs: 500, maxDelayMs: 30_000 }),
    ).resolves.toBe("ok");

    // computeBackoffDelayMs(0, {baseDelayMs: 500, maxDelayMs: 30000}) with
    // Math.random() mocked to 0.5: cap = 500, delay = 0.5 * 500.
    expect(sleep).toHaveBeenCalledWith(250);

    randomSpy.mockRestore();
  });
});

describe("withGoogleRetry observability logging", () => {
  const noopSleep = async () => undefined;

  it("logs nothing on the common first-try-success path", async () => {
    const sleep = jest.fn(noopSleep);
    const fn = jest.fn().mockResolvedValue("ok");

    await withGoogleRetry(fn, { sleep });

    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("logs once when a call succeeds after retrying", async () => {
    const sleep = jest.fn(noopSleep);
    const err = makeGaxiosError({ status: 429 });
    const fn = jest.fn().mockRejectedValueOnce(err).mockResolvedValueOnce("ok");

    await withGoogleRetry(fn, { sleep });

    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        attempts: 2,
        outcome: "success",
        code: 429,
        elapsedMs: expect.any(Number),
      }),
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("logs once when a call fails after exhausting retries", async () => {
    const sleep = jest.fn(noopSleep);
    const err = makeGaxiosError({ status: 500 });
    const fn = jest.fn().mockRejectedValue(err);

    await expect(withGoogleRetry(fn, { sleep, maxAttempts: 2 })).rejects.toBe(
      err,
    );

    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        attempts: 2,
        outcome: "failure",
        code: 500,
        elapsedMs: expect.any(Number),
      }),
    );
  });

  it("logs nothing extra when a non-retryable error fails on the first try", async () => {
    const sleep = jest.fn(noopSleep);
    const err = makeGaxiosError({ status: 404 });
    const fn = jest.fn().mockRejectedValue(err);

    await expect(withGoogleRetry(fn, { sleep })).rejects.toBe(err);

    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
