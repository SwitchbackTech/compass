import { buildPostHogProperties } from "./posthog-exception.transport";
import { describe, expect, it } from "bun:test";

function gaxiosError(message: string): Error {
  return Object.assign(new Error(message), {
    config: { headers: { Authorization: "Bearer super-secret-token" } },
    response: { status: 403 },
  });
}

describe("buildPostHogProperties", () => {
  it("turns an Error-valued cause into cause_chain and root_cause", () => {
    const props = buildPostHogProperties({
      level: "error",
      message: "Sync job engine failed",
      cause: new Error("wrapper", {
        cause: gaxiosError("Google refused to open the channel"),
      }),
    });

    expect(props["cause_chain"]).toEqual([
      { name: "Error", message: "wrapper" },
      { name: "Error", message: "Google refused to open the channel" },
    ]);
    expect(props["root_cause"]).toBe("Google refused to open the channel");
    expect(props["cause"]).toBeUndefined();
  });

  it("drops a non-Error cause instead of forwarding it raw", () => {
    const props = buildPostHogProperties({
      level: "error",
      message: "odd",
      cause: { headers: { Authorization: "Bearer super-secret-token" } },
    });

    expect(props["cause"]).toBeUndefined();
    expect(props["cause_chain"]).toBeUndefined();
    expect(JSON.stringify(props)).not.toContain("super-secret-token");
  });

  it("forwards any other Error-valued field as a safe chain, never the raw error", () => {
    const props = buildPostHogProperties({
      level: "error",
      message: "x",
      err: gaxiosError("boom"),
    });

    expect(props["err"]).toEqual([{ name: "Error", message: "boom" }]);
    expect(JSON.stringify(props)).not.toContain("super-secret-token");
  });

  it("drops unsafe meta keys outright", () => {
    const props = buildPostHogProperties({
      level: "error",
      message: "x",
      response: { status: 500, data: { error: "x" } },
      client_secret: "shh",
      resourceId: "res-1",
    });

    expect(props["response"]).toBeUndefined();
    expect(props["client_secret"]).toBeUndefined();
    expect(props["resourceId"]).toBe("res-1");
  });

  it("skips level, message, stack, userId, and symbol/bracket keys", () => {
    const props = buildPostHogProperties({
      level: "error",
      message: "x",
      stack: "at foo",
      userId: "u1",
      resourceId: "res-1",
    });

    expect(props).toEqual({ resourceId: "res-1" });
  });
});
