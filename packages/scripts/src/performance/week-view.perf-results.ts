export type BrowserMetricSummary = {
  longTaskCount: number;
  maxFrameGapMs: number;
  maxLongTaskMs: number;
};

export type ScenarioSample = BrowserMetricSummary & {
  durationMs: number;
};

export type ScenarioResult = BrowserMetricSummary & {
  averageMs: number;
  maxMs: number;
  medianMs: number;
  minMs: number;
  name: string;
  p95Ms: number;
  samples: ScenarioSample[];
};

export type RunContext = {
  browserName: "chromium";
  browserVersion: string;
  bunVersion?: string;
  headless: boolean;
  nodeVersion?: string;
  platform: NodeJS.Platform;
  scenarios: string[];
  viewport: {
    height: number;
    width: number;
  };
  warmupRuns: number;
  weekStart: string;
};

export type MetricComparison = {
  after: number;
  before: number;
  delta: number;
  deltaPercent: number;
};

export type ScenarioComparison = {
  longTaskCount: MetricComparison;
  maxFrameGapMs: MetricComparison;
  maxLongTaskMs: MetricComparison;
  medianMs: MetricComparison;
  name: string;
  p95Ms: MetricComparison;
};

export type PerfComparison = {
  baseline: {
    branch: string;
    commit: string;
    dirty: boolean;
    label: string;
    outputPath: string;
    runAt: string;
  };
  scenarios: ScenarioComparison[];
};

export type PerfRunResult = {
  baseUrl: string;
  comparison?: PerfComparison;
  git: {
    branch: string;
    commit: string;
    dirty: boolean;
  };
  label: string;
  note?: string;
  outputPath: string;
  runAt: string;
  runContext: RunContext;
  runsPerScenario: number;
  scenarios: ScenarioResult[];
};

type ComparableRun = Pick<PerfRunResult, "git" | "runsPerScenario"> & {
  runContext?: Partial<RunContext>;
};

export const getLatestPath = (outputDir: string) =>
  `${outputDir.replace(/\/$/, "")}/latest.json`;

export const resolveComparePath = (compare: string, outputDir: string) => {
  if (compare === "latest") {
    return getLatestPath(outputDir);
  }

  return compare;
};

const buildMetricComparison = (
  before: number,
  after: number,
): MetricComparison => {
  const delta = after - before;
  const deltaPercent = before === 0 ? 0 : (delta / before) * 100;

  return { after, before, delta, deltaPercent };
};

export const buildComparison = (
  baseline: PerfRunResult | null,
  current: PerfRunResult,
): PerfComparison | undefined => {
  if (!baseline) {
    return undefined;
  }

  const baselineByName = new Map(
    baseline.scenarios.map((scenario) => [scenario.name, scenario]),
  );

  const scenarios = current.scenarios.flatMap((currentScenario) => {
    const baselineScenario = baselineByName.get(currentScenario.name);

    if (!baselineScenario) {
      return [];
    }

    return [
      {
        longTaskCount: buildMetricComparison(
          baselineScenario.longTaskCount,
          currentScenario.longTaskCount,
        ),
        maxFrameGapMs: buildMetricComparison(
          baselineScenario.maxFrameGapMs,
          currentScenario.maxFrameGapMs,
        ),
        maxLongTaskMs: buildMetricComparison(
          baselineScenario.maxLongTaskMs,
          currentScenario.maxLongTaskMs,
        ),
        medianMs: buildMetricComparison(
          baselineScenario.medianMs,
          currentScenario.medianMs,
        ),
        name: currentScenario.name,
        p95Ms: buildMetricComparison(
          baselineScenario.p95Ms,
          currentScenario.p95Ms,
        ),
      },
    ];
  });

  return {
    baseline: {
      branch: baseline.git.branch,
      commit: baseline.git.commit,
      dirty: baseline.git.dirty,
      label: baseline.label,
      outputPath: baseline.outputPath,
      runAt: baseline.runAt,
    },
    scenarios,
  };
};

const areScenarioListsEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((name, index) => name === right[index]);
};

export const validateLatestComparison = ({
  baseline,
  compare,
  current,
  expectedScenarios,
}: {
  baseline: PerfRunResult | null;
  compare: string | undefined;
  current: ComparableRun;
  expectedScenarios: string[];
}) => {
  if (compare !== "latest" || !baseline) {
    return;
  }

  const mismatches: string[] = [];

  if (baseline.git.branch !== current.git.branch) {
    mismatches.push(
      `latest belongs to branch ${baseline.git.branch}, not ${current.git.branch}`,
    );
  }

  if (baseline.runsPerScenario !== current.runsPerScenario) {
    mismatches.push(
      `latest used ${baseline.runsPerScenario} sample(s), not ${current.runsPerScenario}`,
    );
  }

  if (
    typeof baseline.runContext?.headless === "boolean" &&
    typeof current.runContext?.headless === "boolean" &&
    baseline.runContext.headless !== current.runContext.headless
  ) {
    mismatches.push(
      `latest used ${baseline.runContext.headless ? "headless" : "headed"} browser mode`,
    );
  }

  if (
    baseline.runContext?.viewport &&
    current.runContext?.viewport &&
    (baseline.runContext.viewport.width !== current.runContext.viewport.width ||
      baseline.runContext.viewport.height !==
        current.runContext.viewport.height)
  ) {
    mismatches.push(
      `latest used ${baseline.runContext.viewport.width}x${baseline.runContext.viewport.height} viewport`,
    );
  }

  if (
    baseline.runContext?.weekStart &&
    current.runContext?.weekStart &&
    baseline.runContext.weekStart !== current.runContext.weekStart
  ) {
    mismatches.push(`latest used seed week ${baseline.runContext.weekStart}`);
  }

  if (
    baseline.runContext?.scenarios &&
    !areScenarioListsEqual(baseline.runContext.scenarios, expectedScenarios)
  ) {
    mismatches.push(
      `latest used scenario set ${baseline.runContext.scenarios.join(", ")}`,
    );
  }

  if (mismatches.length === 0) {
    return;
  }

  throw new Error(
    [
      "Refusing to compare against latest because it is not the same benchmark shape:",
      ...mismatches.map((mismatch) => `- ${mismatch}`),
      "Use the saved JSON path explicitly if this comparison is intentional.",
    ].join("\n"),
  );
};
