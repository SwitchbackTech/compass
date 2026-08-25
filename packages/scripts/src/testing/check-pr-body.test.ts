import { checkPrBody } from "./check-pr-body";
import { describe, expect, it } from "bun:test";

const FILLED = `## Summary

Adds a constraints checker.

## Automated validation

bun packages/scripts/src/testing/check-agent-constraints.ts exited 0.

## Independent review

Self review of the scripts diff; no production edits.

## Test plan

bun test:scripts and bun run lint.
`;

describe("checkPrBody", () => {
  it("accepts a template with executed evidence in required sections", () => {
    expect(checkPrBody(FILLED)).toEqual([]);
  });

  it("fails closed on a missing or empty body", () => {
    expect(checkPrBody(null)).toEqual([
      "PR body is empty or unreadable (fail closed)",
    ]);
    expect(checkPrBody("   ")).toEqual([
      "PR body is empty or unreadable (fail closed)",
    ]);
  });

  it("fails when Test plan is only an HTML comment", () => {
    const body = FILLED.replace(
      "bun test:scripts and bun run lint.",
      "<!-- Commands actually run. -->",
    );
    expect(checkPrBody(body).some((issue) => issue.includes("Test plan"))).toBe(
      true,
    );
  });

  it("fails when Test plan is only nested HTML comments", () => {
    const body = FILLED.replace(
      "bun test:scripts and bun run lint.",
      "<!--<!-- -->-->",
    );
    expect(checkPrBody(body).some((issue) => issue.includes("Test plan"))).toBe(
      true,
    );
  });

  it("fails missing required headings", () => {
    const issues = checkPrBody(
      "## Summary\n\nhello world this is long enough\n",
    );
    expect(issues).toContain("missing ## Automated validation");
    expect(issues).toContain("missing ## Independent review");
    expect(issues).toContain("missing ## Test plan");
  });

  it("rejects unchecked task boxes as evidence", () => {
    const body = FILLED.replace(
      "bun test:scripts and bun run lint.",
      "- [ ] run tests\nThis is otherwise long enough.",
    );
    expect(
      checkPrBody(body).some((issue) => issue.includes("task boxes")),
    ).toBe(true);
  });
});
