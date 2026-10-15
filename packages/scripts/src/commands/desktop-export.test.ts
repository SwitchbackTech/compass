import { describe, expect, it } from "bun:test";

describe("desktop:export timezone pinning", () => {
  it("passes --check when TZ is unset at startup", async () => {
    const env = { ...process.env };
    delete env["TZ"];
    const child = Bun.spawn(
      [
        process.execPath,
        "packages/scripts/src/cli.ts",
        "desktop:export",
        "--check",
      ],
      { env, stdout: "pipe", stderr: "pipe" },
    );
    const [stderr, code] = await Promise.all([
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ code, stderr }).toEqual({ code: 0, stderr: expect.any(String) });
  }, 120_000);
});
