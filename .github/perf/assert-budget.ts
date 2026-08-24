/**
 * Performance budget gate, invoked by .github/workflows/perf-budget.yml.
 *
 * Runs Lighthouse (desktop preset) against the compressed local server a few
 * times and asserts the median against the budgets below. Medians are used
 * because single Lighthouse runs vary run-to-run, especially on CI runners.
 *
 * Lighthouse is pinned because @lhci/cli's bundled Lighthouse 12 reports
 * NO_LCP against current Chrome; 13.x traces LCP correctly.
 *
 * Baseline when this was set up (2026-08-24, desktop preset over gzip):
 * LCP ~1.9s, FCP ~0.8s, script transfer ~1,085 KB.
 *
 * 2026-08-24: lazy-loading the event form (TipTap/react-datepicker/
 * react-select) dropped script transfer to ~916 KB; budget tightened to
 * 1,100 KB so statically re-importing the editor stack (~170 KB gz) fails
 * the gate.
 */
import { mkdirSync } from "node:fs";

const LIGHTHOUSE_VERSION = "13.4.1";
const URL_UNDER_TEST = process.env.PERF_URL || "http://localhost:9161/";
const RUNS = 3;
const REPORT_DIR = "perf-reports";

/** [label, budget, unit, level] — level "error" fails the job, "warn" logs. */
const BUDGETS = [
  {
    metric: "lcp",
    label: "Largest Contentful Paint",
    max: 3000,
    unit: "ms",
    level: "error",
  },
  {
    metric: "fcp",
    label: "First Contentful Paint",
    max: 1500,
    unit: "ms",
    level: "warn",
  },
  {
    metric: "scriptBytes",
    label: "Script transfer size",
    max: 1_100_000,
    unit: "bytes",
    level: "error",
  },
] as const;

interface RunMetrics {
  lcp: number;
  fcp: number;
  scriptBytes: number;
}

interface LighthouseReport {
  audits: Record<
    string,
    {
      numericValue?: number;
      errorMessage?: string;
      details?: {
        items?: Array<{ resourceType?: string; transferSize?: number }>;
      };
    }
  >;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function runLighthouse(runIndex: number): Promise<RunMetrics> {
  const reportPath = `${REPORT_DIR}/run-${runIndex}.json`;
  const proc = Bun.spawn(
    [
      "npx",
      "--yes",
      `lighthouse@${LIGHTHOUSE_VERSION}`,
      URL_UNDER_TEST,
      "--preset=desktop",
      "--only-categories=performance",
      "--output=json",
      `--output-path=${reportPath}`,
      "--chrome-flags=--headless=new --no-sandbox",
      "--quiet",
    ],
    { stdout: "inherit", stderr: "inherit" },
  );

  if ((await proc.exited) !== 0) {
    throw new Error(`Lighthouse run ${runIndex} exited non-zero`);
  }

  const report = (await Bun.file(reportPath).json()) as LighthouseReport;
  const lcpAudit = report.audits["largest-contentful-paint"];
  const fcpAudit = report.audits["first-contentful-paint"];

  if (typeof lcpAudit?.numericValue !== "number") {
    throw new Error(
      `Run ${runIndex} produced no LCP value (${lcpAudit?.errorMessage ?? "unknown error"})`,
    );
  }
  if (typeof fcpAudit?.numericValue !== "number") {
    throw new Error(`Run ${runIndex} produced no FCP value`);
  }

  const scriptRow = report.audits["resource-summary"]?.details?.items?.find(
    (item) => item.resourceType === "script",
  );

  return {
    lcp: lcpAudit.numericValue,
    fcp: fcpAudit.numericValue,
    scriptBytes: scriptRow?.transferSize ?? 0,
  };
}

mkdirSync(REPORT_DIR, { recursive: true });

const runs: RunMetrics[] = [];
for (let i = 1; i <= RUNS; i++) {
  console.log(`\nLighthouse run ${i}/${RUNS} against ${URL_UNDER_TEST}...`);
  runs.push(await runLighthouse(i));
}

const medians: RunMetrics = {
  lcp: median(runs.map((r) => r.lcp)),
  fcp: median(runs.map((r) => r.fcp)),
  scriptBytes: median(runs.map((r) => r.scriptBytes)),
};

console.log(`\nPerformance budget (median of ${RUNS} runs):`);
let failed = false;
for (const budget of BUDGETS) {
  const value = medians[budget.metric];
  const overBudget = value > budget.max;
  const status = overBudget
    ? budget.level === "error"
      ? "FAIL"
      : "WARN"
    : "ok";
  const all = runs.map((r) => Math.round(r[budget.metric])).join(", ");

  console.log(
    `  [${status}] ${budget.label}: ${Math.round(value)} ${budget.unit}` +
      ` (budget ${budget.max} ${budget.unit}; runs: ${all})`,
  );
  if (overBudget && budget.level === "error") {
    failed = true;
  }
}

if (failed) {
  console.error("\nPerformance budget exceeded.");
  process.exit(1);
}
console.log("\nPerformance budget met.");
