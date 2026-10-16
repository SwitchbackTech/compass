/**
 * Compare deploy-shaped boot gzip on the PR head vs merge base, post a sticky
 * PR comment, and exit non-zero when growth exceeds the per-PR budget unless
 * the PR has the bundle-size-ok label.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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

function hasOverrideLabel(prNumber: string): boolean {
  const out = execFileSync(
    "gh",
    ["pr", "view", prNumber, "--json", "labels", "--jq", ".labels[].name"],
    { encoding: "utf8", cwd: repoRoot },
  ).trim();
  return out.split("\n").filter(Boolean).includes(overrideLabel);
}

function listPrComments(
  prNumber: string,
): Array<{ id: number; body?: string }> {
  const out = execFileSync(
    "gh",
    [
      "api",
      `repos/${process.env.GITHUB_REPOSITORY}/issues/${prNumber}/comments`,
      "--paginate",
    ],
    { encoding: "utf8", cwd: repoRoot },
  ).trim();
  return out ? (JSON.parse(out) as Array<{ id: number; body?: string }>) : [];
}

function upsertStickyComment(prNumber: string, body: string): void {
  const fullBody = `${commentMarker}\n${body}`;
  const existing = listPrComments(prNumber).find((comment) =>
    (comment.body ?? "").includes(commentMarker),
  );
  const repo = process.env.GITHUB_REPOSITORY;
  execFileSync(
    "gh",
    [
      "api",
      "--method",
      existing ? "PATCH" : "POST",
      existing
        ? `repos/${repo}/issues/comments/${existing.id}`
        : `repos/${repo}/issues/${prNumber}/comments`,
      "-f",
      `body=${fullBody}`,
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );
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
  let worktreeAdded = false;
  let overBudget = false;
  try {
    execFileSync(
      "git",
      ["worktree", "add", "--detach", baseWorktree, baseSha],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    );
    worktreeAdded = true;
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
    overBudget = deltaBytes > maxDeltaBytes && !overridden;
    if (overBudget) {
      console.error(
        `Boot gzip grew ${deltaBytes} B (> ${maxDeltaBytes} B) vs ${baseSha}.`,
      );
    }
  } finally {
    rmSync(headMetricsPath, { force: true });
    // `git worktree add` can fail (bad sha, dirty state); removing a worktree
    // that was never added throws over the real error, so clean up the bare
    // mkdtemp directory instead.
    if (worktreeAdded) {
      execFileSync("git", ["worktree", "remove", "--force", baseWorktree], {
        cwd: repoRoot,
        stdio: "inherit",
      });
    } else {
      rmSync(baseWorktree, { force: true, recursive: true });
    }
  }

  // Exiting inside the try above would skip the cleanup in `finally`.
  if (overBudget) {
    process.exit(1);
  }
}

main();
