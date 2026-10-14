/**
 * Compare deploy-shaped boot gzip on the PR head vs merge base, post a sticky
 * PR comment, and exit non-zero when growth exceeds the per-PR budget unless
 * the PR has the bundle-size-ok label.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../..");
const measureScript = path.join(
  repoRoot,
  ".github/perf/run-boot-size-check.sh",
);
const maxDeltaBytes = 5 * 1024;
const commentMarker = "<!-- compass-boot-size-delta -->";
const overrideLabel = "bundle-size-ok";

interface BootMetrics {
  totalGzipBytes: number;
}

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatSignedKb(deltaBytes: number): string {
  const kb = deltaBytes / 1024;
  const sign = kb >= 0 ? "+" : "";
  return `${sign}${kb.toFixed(1)} KB`;
}

function parseMetricsFile(filePath: string): BootMetrics {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as BootMetrics).totalGzipBytes !== "number"
  ) {
    throw new Error(`Invalid boot metrics at ${filePath}`);
  }
  return raw as BootMetrics;
}

function measureBootGzip(cwd: string, metricsPath: string): BootMetrics {
  execFileSync("bash", [measureScript], {
    cwd,
    env: {
      ...process.env,
      COMPASS_BOOT_SIZE_ENFORCE: "0",
      COMPASS_BOOT_SIZE_METRICS_FILE: metricsPath,
    },
    stdio: "inherit",
  });
  return parseMetricsFile(metricsPath);
}

function ghJson(args: string[]): unknown {
  const out = execFileSync("gh", args, {
    encoding: "utf8",
    cwd: repoRoot,
  }).trim();
  return out ? JSON.parse(out) : null;
}

function hasOverrideLabel(prNumber: string): boolean {
  const out = execFileSync(
    "gh",
    ["pr", "view", prNumber, "--json", "labels", "--jq", ".labels[].name"],
    { encoding: "utf8", cwd: repoRoot },
  ).trim();
  return out.split("\n").filter(Boolean).includes(overrideLabel);
}

function upsertStickyComment(prNumber: string, body: string): void {
  const marker = commentMarker;
  const fullBody = `${marker}\n${body}`;
  const comments = ghJson([
    "api",
    `repos/${process.env.GITHUB_REPOSITORY}/issues/${prNumber}/comments`,
    "--paginate",
  ]) as Array<{ id: number; body?: string }> | null;

  const existing = (comments ?? []).find((comment) =>
    (comment.body ?? "").includes(marker),
  );
  if (existing) {
    execFileSync(
      "gh",
      [
        "api",
        "--method",
        "PATCH",
        `repos/${process.env.GITHUB_REPOSITORY}/issues/comments/${existing.id}`,
        "-f",
        `body=${fullBody}`,
      ],
      { cwd: repoRoot, stdio: "inherit" },
    );
    return;
  }

  const commentFile = path.join(
    tmpdir(),
    `compass-boot-comment-${process.pid}.md`,
  );
  writeFileSync(commentFile, fullBody, "utf8");
  try {
    execFileSync(
      "gh",
      ["pr", "comment", prNumber, "--body-file", commentFile],
      { cwd: repoRoot, stdio: "inherit" },
    );
  } finally {
    rmSync(commentFile, { force: true });
  }
}

function main(): void {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA ?? "HEAD";
  const prNumber = process.env.PR_NUMBER;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!baseSha) {
    throw new Error("BASE_SHA is required");
  }
  if (!repository) {
    throw new Error("GITHUB_REPOSITORY is required");
  }

  const headMetricsPath = path.join(
    tmpdir(),
    `compass-boot-head-${process.pid}.json`,
  );
  const headMetrics = measureBootGzip(repoRoot, headMetricsPath);

  const baseWorktree = mkdtempSync(path.join(tmpdir(), "compass-boot-base-"));
  try {
    execFileSync(
      "git",
      ["worktree", "add", "--detach", baseWorktree, baseSha],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    );
    execFileSync("bun", ["install", "--frozen-lockfile"], {
      cwd: baseWorktree,
      stdio: "inherit",
    });
    const baseMetricsPath = path.join(baseWorktree, "boot-base-metrics.json");
    const baseMetrics = measureBootGzip(baseWorktree, baseMetricsPath);

    const deltaBytes = headMetrics.totalGzipBytes - baseMetrics.totalGzipBytes;
    const summary = `Boot bundle: ${formatKb(headMetrics.totalGzipBytes)} gzip (${formatSignedKb(deltaBytes)} vs main)`;

    console.log(summary);
    console.log(
      `  head ${headSha}: ${headMetrics.totalGzipBytes} B gzip, base ${baseSha}: ${baseMetrics.totalGzipBytes} B gzip`,
    );

    if (prNumber) {
      const limitNote =
        deltaBytes > maxDeltaBytes
          ? `\n\nDelta exceeds +${maxDeltaBytes / 1024} KB per PR. Add the \`${overrideLabel}\` label to allow intentional growth.`
          : "";
      upsertStickyComment(prNumber, `${summary}${limitNote}`);
    }

    const overridden = prNumber ? hasOverrideLabel(prNumber) : false;
    if (deltaBytes > maxDeltaBytes && !overridden) {
      console.error(
        `Boot gzip grew ${deltaBytes} B (> ${maxDeltaBytes} B) vs ${baseSha}.`,
      );
      process.exit(1);
    }
  } finally {
    rmSync(headMetricsPath, { force: true });
    execFileSync("git", ["worktree", "remove", "--force", baseWorktree], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }
}

main();
