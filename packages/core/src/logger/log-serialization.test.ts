import {
  describeErrorChain,
  formatErrorChain,
  isUnsafeMetaKey,
  rootCauseMessage,
} from "./log-serialization";
import { describe, expect, it } from "bun:test";

// Mirrors the gError fixture in google-notifications.adapter.test.ts: a
// gaxios-shaped error carrying a bearer token as an enumerable own property.
function gaxiosError(message: string): Error {
  return Object.assign(new Error(message), {
    config: { headers: { Authorization: "Bearer super-secret-token" } },
    response: { status: 403 },
  });
}

class ProviderErrorLike extends Error {
  readonly reason: string;
  constructor(reason: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProviderNotificationError";
    this.reason = reason;
  }
}

describe("describeErrorChain", () => {
  it("walks a three-level cause chain in order", () => {
    const googleError = gaxiosError("Forbidden");
    const providerError = new ProviderErrorLike(
      "watchFailed",
      "Google refused to open the channel",
      { cause: googleError },
    );
    const wrapper = new Error(
      "Sync job subscriptionMaintain (abc123) attempt 1 failed",
      { cause: providerError },
    );

    const chain = describeErrorChain(wrapper);

    expect(chain).toHaveLength(3);
    expect(chain[0]).toEqual({
      name: "Error",
      message: "Sync job subscriptionMaintain (abc123) attempt 1 failed",
    });
    expect(chain[1]).toEqual({
      name: "ProviderNotificationError",
      message: "Google refused to open the channel",
      reason: "watchFailed",
    });
    expect(chain[2]).toEqual({ name: "Error", message: "Forbidden" });
  });

  it("omits reason when absent or non-string", () => {
    const withNumericReason = Object.assign(new Error("odd"), { reason: 42 });
    expect(describeErrorChain(withNumericReason)).toEqual([
      { name: "Error", message: "odd" },
    ]);
  });

  it("stops at maxDepth", () => {
    let error = new Error("level-0");
    for (let i = 1; i <= 10; i++) {
      error = new Error(`level-${i}`, { cause: error });
    }

    expect(describeErrorChain(error, 3)).toHaveLength(3);
  });

  it("terminates on a self-referential cause cycle", () => {
    const a: Error & { cause?: unknown } = new Error("a");
    const b = new Error("b", { cause: a });
    a.cause = b;

    const chain = describeErrorChain(a);

    // a -> b -> a: the second "a" is already in the WeakSet, so the walk
    // stops there rather than looping to maxDepth. Without cycle detection
    // this would return 5 entries (a, b, a, b, a), not 2.
    expect(chain).toEqual([
      { name: "Error", message: "a" },
      { name: "Error", message: "b" },
    ]);
  });

  it("returns an empty array for non-Error input", () => {
    expect(describeErrorChain("not an error")).toEqual([]);
    expect(describeErrorChain(undefined)).toEqual([]);
    expect(describeErrorChain({ message: "plain object" })).toEqual([]);
  });

  it("never surfaces a bearer token from a gaxios-shaped cause", () => {
    const googleError = gaxiosError("token leak check");
    const wrapper = new Error("wrapper", { cause: googleError });

    const chain = describeErrorChain(wrapper);

    expect(JSON.stringify(chain)).not.toContain("super-secret-token");
  });
});

describe("formatErrorChain", () => {
  it("renders innermost last, including the reason when present", () => {
    const chain = describeErrorChain(
      new Error("outer", {
        cause: new ProviderErrorLike("watchFailed", "middle", {
          cause: new Error("inner"),
        }),
      }),
    );

    expect(formatErrorChain(chain)).toBe(
      "Error: outer <- ProviderNotificationError(watchFailed): middle <- Error: inner",
    );
  });
});

describe("rootCauseMessage", () => {
  it("returns the deepest message in the chain", () => {
    const chain = describeErrorChain(
      new Error("outer", { cause: new Error("inner-most") }),
    );

    expect(rootCauseMessage(chain)).toBe("inner-most");
  });

  it("returns undefined for an empty chain", () => {
    expect(rootCauseMessage([])).toBeUndefined();
  });
});

describe("isUnsafeMetaKey", () => {
  it("is case- and separator-insensitive and covers each denied key", () => {
    const denied = [
      "config",
      "Request",
      "RESPONSE",
      "headers",
      "Authorization",
      "token",
      "accessToken",
      "access_token",
      "refreshToken",
      "refresh_token",
      "idToken",
      "id_token",
      "clientSecret",
      "client_secret",
      "apiKey",
      "api_key",
      "password",
      "credential",
      "cookie",
    ];

    for (const key of denied) {
      expect(isUnsafeMetaKey(key)).toBe(true);
    }
  });

  it("allows ordinary keys, including ones that share a substring with a denied word", () => {
    expect(isUnsafeMetaKey("resourceId")).toBe(false);
    expect(isUnsafeMetaKey("namespace")).toBe(false);
    expect(isUnsafeMetaKey("requestId")).toBe(false);
    expect(isUnsafeMetaKey("responseTimeMs")).toBe(false);
  });
});
