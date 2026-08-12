import {
  isTransientMongoNetworkError,
  withTransientMongoRetry,
} from "./mongo-network-error.util";
import { describe, expect, it, mock } from "bun:test";

function namedError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe("isTransientMongoNetworkError", () => {
  it("matches Mongo driver network and pool-cleared error names", () => {
    expect(
      isTransientMongoNetworkError(
        namedError(
          "PoolClearedOnNetworkError",
          "Connection to host:27017 interrupted due to server monitor timeout",
        ),
      ),
    ).toBe(true);
    expect(
      isTransientMongoNetworkError(
        namedError("MongoNetworkError", "getaddrinfo ESERVFAIL"),
      ),
    ).toBe(true);
    expect(
      isTransientMongoNetworkError(
        namedError("MongoServerSelectionError", "Server selection timed out"),
      ),
    ).toBe(true);
  });

  it("matches DNS and socket blip messages even without a driver name", () => {
    expect(
      isTransientMongoNetworkError(new Error("getaddrinfo ESERVFAIL foo")),
    ).toBe(true);
    expect(isTransientMongoNetworkError(new Error("read ECONNRESET"))).toBe(
      true,
    );
  });

  it("rejects unrelated failures", () => {
    expect(
      isTransientMongoNetworkError(new Error("database unavailable")),
    ).toBe(false);
    expect(isTransientMongoNetworkError("not an error")).toBe(false);
    expect(isTransientMongoNetworkError(null)).toBe(false);
  });
});

describe("withTransientMongoRetry", () => {
  it("returns on the first success", async () => {
    const operation = mock(() => Promise.resolve("ok"));
    await expect(
      withTransientMongoRetry(operation, { attempts: 3 }),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries transient Mongo blips then succeeds", async () => {
    const sleep = mock((_ms: number) => Promise.resolve());
    const operation = mock(() => Promise.resolve("ok"));
    operation
      .mockImplementationOnce(() =>
        Promise.reject(
          namedError("MongoNetworkError", "getaddrinfo ESERVFAIL"),
        ),
      )
      .mockImplementationOnce(() => Promise.resolve("ok"));

    await expect(
      withTransientMongoRetry(operation, { attempts: 3, delayMs: 10, sleep }),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it("does not retry non-transient failures", async () => {
    const sleep = mock((_ms: number) => Promise.resolve());
    const failure = new Error("database unavailable");
    const operation = mock(() => Promise.reject(failure));

    await expect(
      withTransientMongoRetry(operation, { attempts: 3, delayMs: 10, sleep }),
    ).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("rethrows the last transient failure after exhausting attempts", async () => {
    const sleep = mock((_ms: number) => Promise.resolve());
    const failure = namedError(
      "PoolClearedOnNetworkError",
      "Connection interrupted due to server monitor timeout",
    );
    const operation = mock(() => Promise.reject(failure));

    await expect(
      withTransientMongoRetry(operation, { attempts: 3, delayMs: 5, sleep }),
    ).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
