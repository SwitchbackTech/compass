import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runDetector(eventName: string, files = "", ghStatus = 0) {
  const directory = mkdtempSync(join(tmpdir(), "detect-code-changes-"));
  const bin = join(directory, "bin");
  const log = join(directory, "gh.log");
  const output = join(directory, "github-output");
  mkdirSync(bin);

  writeFileSync(
    join(bin, "gh"),
    `#!/usr/bin/env bash
printf '%s\n' "$*" > "$DETECT_CODE_CHANGES_TEST_LOG"
if [ "$DETECT_CODE_CHANGES_TEST_STATUS" != "0" ]; then
  exit "$DETECT_CODE_CHANGES_TEST_STATUS"
fi
printf '%s' "$DETECT_CODE_CHANGES_TEST_FILES"
`,
    { mode: 0o755 },
  );

  const result = spawnSync(
    "bash",
    [
      ".github/scripts/detect-code-changes.sh",
      eventName,
      "example/compass",
      "42",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        DETECT_CODE_CHANGES_TEST_FILES: files,
        DETECT_CODE_CHANGES_TEST_LOG: log,
        DETECT_CODE_CHANGES_TEST_STATUS: String(ghStatus),
        GITHUB_OUTPUT: output,
        PATH: `${bin}:${process.env.PATH}`,
      },
    },
  );

  const details = {
    ...result,
    command: existsSync(log) ? readFileSync(log, "utf8") : "",
    output: readFileSync(output, "utf8"),
  };
  rmSync(directory, { force: true, recursive: true });
  return details;
}

describe("detect-code-changes", () => {
  it("is the single detector used by both required-check workflows", () => {
    for (const workflowPath of [
      ".github/workflows/test-unit.yml",
      ".github/workflows/test-e2e.yml",
    ]) {
      const workflow = readFileSync(workflowPath, "utf8");

      expect(workflow).toContain("bash .github/scripts/detect-code-changes.sh");
      expect(workflow).not.toContain("gh api --paginate");
    }
  });

  it("runs Unit once per PR push and names Unit vs E2E", () => {
    const unit = readFileSync(".github/workflows/test-unit.yml", "utf8");
    const e2e = readFileSync(".github/workflows/test-e2e.yml", "utf8");

    expect(unit).toMatch(/^name: Unit$/m);
    expect(e2e).toMatch(/^name: E2E$/m);
    expect(unit).toContain("branches:");
    expect(unit).toContain(
      "group: unit-${{ github.event.pull_request.number || github.ref }}",
    );
    expect(unit).toContain(
      "cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
    );
    expect(unit).toContain("static:");
    expect(unit).toContain("name: unit (${{ matrix.name }})");
    expect(unit).toContain("WEB_TEST_SHARD_INDEX");
    expect(unit).toContain("name: web, 1");
    expect(unit).toContain("name: web, 2");
    expect(unit).not.toContain("uses: actions/setup-node");
    expect(unit).not.toMatch(/^ {2}lint:/m);
    expect(unit).not.toMatch(/^ {2}knip:/m);
    expect(unit).not.toMatch(/^ {2}type-check:/m);
  });

  it("runs checks for non-pull-request events without calling GitHub", () => {
    const result = runDetector("push");

    expect(result.status, result.stderr).toBe(0);
    expect(result.output).toBe("code=true\n");
    expect(result.command).toBe("");
  });

  it("skips checks for docs-only pull requests", () => {
    const result = runDetector(
      "pull_request",
      ".gitignore\ndocs/testing.md\nREADME.md",
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.output).toBe("code=false\n");
  });

  it("runs checks for pull requests containing code", () => {
    const result = runDetector(
      "pull_request",
      "docs/testing.md\npackages/web/src/app.tsx",
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.output).toBe("code=true\n");
    expect(result.command).toContain(
      "api --paginate repos/example/compass/pulls/42/files --jq .[].filename",
    );
  });

  it("runs checks when the pull request file list cannot be verified", () => {
    for (const [files, ghStatus] of [
      ["", 0],
      ["", 1],
    ] as const) {
      const result = runDetector("pull_request", files, ghStatus);

      expect(result.status, result.stderr).toBe(0);
      expect(result.output).toBe("code=true\n");
    }
  });
});
