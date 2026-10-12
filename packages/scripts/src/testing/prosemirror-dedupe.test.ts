import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

// Two prosemirror-model copies make the editor throw "Can not convert <node>
// to a Fragment (looks like multiple versions of prosemirror-model were
// loaded)" at runtime, so the lockfile must resolve exactly one.
describe("prosemirror-model dedupe", () => {
  it("resolves a single prosemirror-model version in bun.lock", () => {
    const lock = readFileSync("bun.lock", "utf8");
    const versions = new Set(
      [...lock.matchAll(/"prosemirror-model@([^"]+)"/g)].map(
        (match) => match[1],
      ),
    );
    expect([...versions]).toHaveLength(1);
  });
});
