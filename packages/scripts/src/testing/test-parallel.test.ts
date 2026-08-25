import { parallelArgsFor, testArgvFor } from "./test-parallel";
import { describe, expect, it } from "bun:test";

const argvOpts = {
  preloadPath: "packages/web/src/__tests__/web.preload.ts",
  bunFlags: [] as string[],
  targets: ["./packages/web/src"],
};

describe("parallelArgsFor", () => {
  it("omits --parallel for the web profile", () => {
    expect(parallelArgsFor("web")).toEqual([]);
  });

  it("keeps --parallel for mongo-free non-web profiles", () => {
    expect(parallelArgsFor("core")).toEqual(["--parallel"]);
    expect(parallelArgsFor("backend-fast")).toEqual(["--parallel"]);
  });
});

describe("testArgvFor", () => {
  it("does not pass --parallel when the web profile builds argv", () => {
    expect(testArgvFor("web", argvOpts)).not.toContain("--parallel");
  });

  it("passes --parallel for core", () => {
    expect(
      testArgvFor("core", {
        ...argvOpts,
        preloadPath: "packages/scripts/src/testing/core.preload.ts",
        targets: ["./packages/core/src"],
      }),
    ).toContain("--parallel");
  });
});
