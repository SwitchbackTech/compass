export type WeekViewPerfPhase =
  | "pending"
  | "activation"
  | "sustainedMotion"
  | "commit"
  | "cancel"
  | "preNavigationSustainedMotion"
  | "edgeNavigationDwell"
  | "edgeNavigationRender"
  | "postNavigationSustainedMotion";

export type WeekViewPerfInteraction = "drag" | "input" | "resize";

export interface WeekViewPerfPhaseMetrics {
  domMutationsUnexpected: number;
  firstFrameLatencyMs?: number;
  frameGapsMs: number[];
  layoutReadsDuringMotion?: number;
  longTasks: number;
  rafComputeWriteMs: number[];
  reactCommits: number;
  reduxDispatches: number;
  saveRequests: number;
}

export interface WeekViewPerfScenarioResult {
  enabled: boolean;
  interaction: WeekViewPerfInteraction;
  label: string;
  phases: Partial<Record<WeekViewPerfPhase, WeekViewPerfPhaseMetrics>>;
  sampleCount: number;
  scenario: string;
}

export interface WeekViewPerfGateOptions {
  allowedFrameGapMarginMs: number;
  firstFrameLatencyBudgetMs?: number;
  firstFrameLatencyPrototypeBaselineMs?: number;
  inputFloorFrameGapMs: number;
}

export interface WeekViewPerfEvaluation {
  failures: string[];
  scenario: string;
  status: "failed" | "passed" | "skipped";
}

const DEFAULT_GATE_OPTIONS: WeekViewPerfGateOptions = {
  allowedFrameGapMarginMs: 8,
  inputFloorFrameGapMs: 16.7,
};

const ZERO_WORK_PHASES = new Set<WeekViewPerfPhase>([
  "sustainedMotion",
  "preNavigationSustainedMotion",
  "edgeNavigationDwell",
  "postNavigationSustainedMotion",
]);

export const createEmptyWeekViewPerfPhaseMetrics =
  (): WeekViewPerfPhaseMetrics => ({
    domMutationsUnexpected: 0,
    frameGapsMs: [],
    longTasks: 0,
    rafComputeWriteMs: [],
    reactCommits: 0,
    reduxDispatches: 0,
    saveRequests: 0,
  });

export const percentile = (values: number[], percentileValue: number) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;

  return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
};

export const maxOrZero = (values: number[]) =>
  values.length === 0 ? 0 : Math.max(...values);

export const evaluateWeekViewPerfResult = (
  result: WeekViewPerfScenarioResult,
  options: Partial<WeekViewPerfGateOptions> = {},
): WeekViewPerfEvaluation => {
  if (!result.enabled) {
    return {
      failures: [],
      scenario: result.scenario,
      status: "skipped",
    };
  }

  const resolvedOptions = {
    ...DEFAULT_GATE_OPTIONS,
    ...options,
  };
  const failures: string[] = [];

  for (const [phaseName, metrics] of Object.entries(result.phases) as Array<
    [WeekViewPerfPhase, WeekViewPerfPhaseMetrics]
  >) {
    if (ZERO_WORK_PHASES.has(phaseName)) {
      collectZeroWorkFailures(failures, phaseName, metrics);
    }

    if (phaseName === "sustainedMotion") {
      collectSustainedMotionFailures(
        failures,
        result.interaction,
        metrics,
        resolvedOptions,
      );
    }
  }

  return {
    failures,
    scenario: result.scenario,
    status: failures.length === 0 ? "passed" : "failed",
  };
};

const collectZeroWorkFailures = (
  failures: string[],
  phase: WeekViewPerfPhase,
  metrics: WeekViewPerfPhaseMetrics,
) => {
  if (metrics.reactCommits !== 0) {
    failures.push(`${phase}: expected 0 React commits`);
  }

  if (metrics.reduxDispatches !== 0) {
    failures.push(`${phase}: expected 0 Redux dispatches`);
  }

  if (metrics.domMutationsUnexpected !== 0) {
    failures.push(`${phase}: expected 0 unexpected DOM mutations`);
  }

  if (metrics.saveRequests !== 0) {
    failures.push(`${phase}: expected 0 save requests`);
  }

  if (metrics.longTasks !== 0) {
    failures.push(`${phase}: expected 0 long tasks`);
  }

  if ((metrics.layoutReadsDuringMotion ?? 0) !== 0) {
    failures.push(`${phase}: expected 0 layout reads during motion`);
  }
};

const collectSustainedMotionFailures = (
  failures: string[],
  interaction: WeekViewPerfInteraction,
  metrics: WeekViewPerfPhaseMetrics,
  options: WeekViewPerfGateOptions,
) => {
  if (interaction === "input") {
    return;
  }

  if (metrics.rafComputeWriteMs.length === 0) {
    failures.push("sustainedMotion: expected RAF compute/write samples");
  }

  const p95Budget = interaction === "resize" ? 4 : 2;
  const rafP95 = percentile(metrics.rafComputeWriteMs, 95);
  const rafMax = maxOrZero(metrics.rafComputeWriteMs);
  const frameGapMax = maxOrZero(metrics.frameGapsMs);
  const frameGapBudget =
    options.inputFloorFrameGapMs + options.allowedFrameGapMarginMs;

  if (rafP95 >= p95Budget) {
    failures.push(
      `sustainedMotion: expected RAF p95 below ${p95Budget}ms, got ${rafP95}ms`,
    );
  }

  if (rafMax >= 5) {
    failures.push(
      `sustainedMotion: expected RAF max below 5ms, got ${rafMax}ms`,
    );
  }

  if (frameGapMax > frameGapBudget) {
    failures.push(
      `sustainedMotion: expected max frame gap <= ${frameGapBudget}ms, got ${frameGapMax}ms`,
    );
  }

  const firstFrameBudget =
    options.firstFrameLatencyBudgetMs ??
    options.firstFrameLatencyPrototypeBaselineMs;

  if (
    firstFrameBudget !== undefined &&
    metrics.firstFrameLatencyMs !== undefined &&
    metrics.firstFrameLatencyMs > firstFrameBudget
  ) {
    failures.push(
      `sustainedMotion: expected first frame latency <= ${firstFrameBudget}ms, got ${metrics.firstFrameLatencyMs}ms`,
    );
  }
};
