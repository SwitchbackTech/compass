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

function routingOutput(flags: {
  code: boolean;
  e2e: boolean;
  core: boolean;
  web: boolean;
  backend: boolean;
  sync: boolean;
  scripts: boolean;
}) {
  return [
    `code=${flags.code}`,
    `e2e=${flags.e2e}`,
    `core=${flags.core}`,
    `web=${flags.web}`,
    `backend=${flags.backend}`,
    `sync=${flags.sync}`,
    `scripts=${flags.scripts}`,
    "",
  ].join("\n");
}

const ALL_ON = routingOutput({
  code: true,
  e2e: true,
  core: true,
  web: true,
  backend: true,
  sync: true,
  scripts: true,
});

const ALL_OFF = routingOutput({
  code: false,
  e2e: false,
  core: false,
  web: false,
  backend: false,
  sync: false,
  scripts: false,
});

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

  it("gates the e2e shards on the e2e output and the unit legs on per-package outputs", () => {
    const unit = readFileSync(".github/workflows/test-unit.yml", "utf8");
    const e2e = readFileSync(".github/workflows/test-e2e.yml", "utf8");

    expect(e2e).toContain("e2e: ${{ steps.filter.outputs.e2e }}");
    expect(e2e).toContain("if: needs.changes.outputs.e2e == 'true'");
    expect(e2e).not.toContain("needs.changes.outputs.code");
    expect(unit).toContain("code: ${{ steps.filter.outputs.code }}");
    expect(unit).toContain("core: ${{ steps.filter.outputs.core }}");
    expect(unit).toContain("web: ${{ steps.filter.outputs.web }}");
    expect(unit).toContain("needs.changes.outputs[matrix.project] == 'true'");
    expect(unit).toContain("detect-code-changes.test.sh");
    expect(unit).not.toContain("outputs.e2e");
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
    expect(unit).toMatch(/^ {2}merge_group:$/m);
    expect(e2e).toMatch(/^ {2}merge_group:$/m);
    expect(unit).toContain("static:");
    expect(unit).toContain("name: unit-leg (${{ matrix.name }})");
    expect(unit).toContain("WEB_TEST_SHARD_INDEX");
    expect(unit).toContain("name: web, 1");
    expect(unit).toContain("name: web, 2");
    expect(unit).not.toContain("uses: actions/setup-node");
    expect(unit).not.toMatch(/^ {2}lint:/m);
    expect(unit).not.toMatch(/^ {2}knip:/m);
    expect(unit).not.toMatch(/^ {2}type-check:/m);
  });

  it("runs checks for non-pull-request events without calling GitHub", () => {
    for (const eventName of ["push", "merge_group"]) {
      const result = runDetector(eventName);

      expect(result.status, result.stderr).toBe(0);
      expect(result.output).toBe(ALL_ON);
      expect(result.command).toBe("");
    }
  });

  it("skips checks for docs-only pull requests", () => {
    const result = runDetector(
      "pull_request",
      ".gitignore\ndocs/testing.md\nREADME.md",
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.output).toBe(ALL_OFF);
  });

  it("skips only e2e for backend, sync, and scripts pull requests", () => {
    const result = runDetector(
      "pull_request",
      "packages/backend/src/app.ts\npackages/sync/src/jobs.ts\npackages/scripts/src/cli.ts\ndocs/sync.md",
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.output).toBe(
      routingOutput({
        code: true,
        e2e: false,
        core: false,
        web: false,
        backend: true,
        sync: true,
        scripts: true,
      }),
    );
  });

  it("runs e2e when a backend pull request also touches anything else", () => {
    for (const other of [
      "packages/core/src/types.ts",
      "packages/web/src/app.tsx",
      "e2e/timed/event-smoke.spec.ts",
      "playwright.config.ts",
      "bun.lock",
      ".github/workflows/test-e2e.yml",
    ]) {
      const result = runDetector(
        "pull_request",
        `packages/backend/src/app.ts\n${other}`,
      );

      expect(result.status, result.stderr).toBe(0);
      expect(result.output, other).toMatch(/^code=true\ne2e=true\n/);
    }
  });

  it("runs checks for pull requests containing code", () => {
    const result = runDetector(
      "pull_request",
      "docs/testing.md\npackages/web/src/app.tsx",
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.output).toBe(
      routingOutput({
        code: true,
        e2e: true,
        core: false,
        web: true,
        backend: false,
        sync: false,
        scripts: false,
      }),
    );
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
      expect(result.output).toBe(ALL_ON);
    }
  });

  it("keeps the bash routing contract green", () => {
    const result = spawnSync(
      "bash",
      [".github/scripts/detect-code-changes.test.sh"],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status, result.stderr + result.stdout).toBe(0);
    expect(result.stdout).toContain("backend-only runs the backend leg");
    expect(result.stdout).toContain("workflow-only skips unit legs");
  });
});
