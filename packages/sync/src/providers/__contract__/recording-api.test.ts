import {
  recordingApi,
  redactValue,
} from "@sync/providers/__contract__/recording-api";
import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("recordingApi redaction", () => {
  it("redacts tokens, emails, and Authorization headers before writing the corpus", async () => {
    const corpusDir = await mkdtemp(join(tmpdir(), "contract-record-"));
    const inner = {
      async echo(input: {
        access_token: string;
        Authorization: string;
        email: string;
        summary: string;
      }) {
        return { ok: true, email: input.email };
      },
    };
    const recorded = recordingApi(inner, corpusDir, "echo");
    await recorded.echo({
      access_token: "ya29.secret",
      Authorization: "Bearer ya29.secret",
      email: "founder@example.com",
      summary: "keep me",
    });

    const written = JSON.parse(
      await readFile(join(corpusDir, "echo.json"), "utf8"),
    ) as Array<{ args: unknown; result: unknown }>;
    const serialized = JSON.stringify(written);
    expect(serialized).not.toContain("ya29.secret");
    expect(serialized).not.toContain("founder@example.com");
    expect(serialized).toContain("keep me");
    expect(redactValue("Bearer abc")).toBe("Bearer [REDACTED]");
  });
});
