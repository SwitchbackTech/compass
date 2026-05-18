import {
  createEmptyWeekViewPerfPhaseMetrics,
  evaluateWeekViewPerfResult,
  percentile,
  type WeekViewPerfScenarioResult,
} from "./week-view.perf-results";

const createScenario = (
  overrides: Partial<WeekViewPerfScenarioResult> = {},
): WeekViewPerfScenarioResult => ({
  enabled: true,
  interaction: "drag",
  label: "test",
  phases: {
    sustainedMotion: createEmptyWeekViewPerfPhaseMetrics(),
  },
  sampleCount: 120,
  scenario: "timed-drag-v2-sustained",
  ...overrides,
});

const addPassingRafSamples = (
  metrics = createEmptyWeekViewPerfPhaseMetrics(),
) => {
  metrics.rafComputeWriteMs = [0.4, 0.5, 0.6];
  metrics.frameGapsMs = [16, 16.2, 16.4];

  return metrics;
};

describe("percentile", () => {
  it("returns the nearest-rank percentile", () => {
    expect(percentile([4, 1, 3, 2], 50)).toBe(2);
    expect(percentile([4, 1, 3, 2], 95)).toBe(4);
  });

  it("returns zero for empty samples", () => {
    expect(percentile([], 95)).toBe(0);
  });
});

describe("evaluateWeekViewPerfResult", () => {
  it("skips disabled scenarios instead of creating fake passing proof", () => {
    const evaluation = evaluateWeekViewPerfResult(
      createScenario({ enabled: false }),
    );

    expect(evaluation).toEqual({
      failures: [],
      scenario: "timed-drag-v2-sustained",
      status: "skipped",
    });
  });

  it("fails sustained motion when ownership counters are non-zero", () => {
    const metrics = addPassingRafSamples();

    metrics.reactCommits = 1;
    metrics.reduxDispatches = 1;
    metrics.domMutationsUnexpected = 1;
    metrics.saveRequests = 1;
    metrics.longTasks = 1;
    metrics.layoutReadsDuringMotion = 1;

    const evaluation = evaluateWeekViewPerfResult(
      createScenario({
        phases: {
          sustainedMotion: metrics,
        },
      }),
    );

    expect(evaluation.status).toBe("failed");
    expect(evaluation.failures).toEqual([
      "sustainedMotion: expected 0 React commits",
      "sustainedMotion: expected 0 Redux dispatches",
      "sustainedMotion: expected 0 unexpected DOM mutations",
      "sustainedMotion: expected 0 save requests",
      "sustainedMotion: expected 0 long tasks",
      "sustainedMotion: expected 0 layout reads during motion",
    ]);
  });

  it("fails zero-work phases when layout-read metrics are missing", () => {
    const metrics = addPassingRafSamples();

    delete metrics.layoutReadsDuringMotion;

    const evaluation = evaluateWeekViewPerfResult(
      createScenario({
        phases: {
          sustainedMotion: metrics,
        },
      }),
    );

    expect(evaluation.status).toBe("failed");
    expect(evaluation.failures).toEqual([
      "sustainedMotion: expected layout read metrics",
    ]);
  });

  it("does not apply sustained zero-work gates to activation and commit phases", () => {
    const activation = createEmptyWeekViewPerfPhaseMetrics();
    const commit = createEmptyWeekViewPerfPhaseMetrics();

    activation.reactCommits = 1;
    commit.reduxDispatches = 1;
    commit.saveRequests = 1;

    const evaluation = evaluateWeekViewPerfResult(
      createScenario({
        phases: {
          activation,
          commit,
          sustainedMotion: addPassingRafSamples(),
        },
      }),
    );

    expect(evaluation.status).toBe("passed");
  });

  it("keeps edge-navigation render work isolated from zero-work dwell phases", () => {
    const render = createEmptyWeekViewPerfPhaseMetrics();
    const dwell = createEmptyWeekViewPerfPhaseMetrics();

    render.reactCommits = 2;
    render.reduxDispatches = 1;
    dwell.reactCommits = 1;

    const evaluation = evaluateWeekViewPerfResult(
      createScenario({
        phases: {
          edgeNavigationDwell: dwell,
          edgeNavigationRender: render,
          postNavigationSustainedMotion: createEmptyWeekViewPerfPhaseMetrics(),
          preNavigationSustainedMotion: createEmptyWeekViewPerfPhaseMetrics(),
        },
      }),
    );

    expect(evaluation.status).toBe("failed");
    expect(evaluation.failures).toEqual([
      "edgeNavigationDwell: expected 0 React commits",
    ]);
  });

  it("fails drag sustained motion when RAF work exceeds hard gates", () => {
    const metrics = addPassingRafSamples();

    metrics.rafComputeWriteMs = [1.5, 1.8, 2.1, 4.9, 5.2];
    metrics.frameGapsMs = [16, 17, 40];

    const evaluation = evaluateWeekViewPerfResult(
      createScenario({
        phases: {
          sustainedMotion: metrics,
        },
      }),
      {
        allowedFrameGapMarginMs: 4,
        inputFloorFrameGapMs: 16,
      },
    );

    expect(evaluation.status).toBe("failed");
    expect(evaluation.failures).toEqual([
      "sustainedMotion: expected RAF p95 below 2ms, got 5.2ms",
      "sustainedMotion: expected RAF max below 5ms, got 5.2ms",
      "sustainedMotion: expected max frame gap <= 20ms, got 40ms",
    ]);
  });

  it("fails migrated sustained motion when no RAF samples were recorded", () => {
    const evaluation = evaluateWeekViewPerfResult(
      createScenario({
        phases: {
          sustainedMotion: createEmptyWeekViewPerfPhaseMetrics(),
        },
      }),
    );

    expect(evaluation.status).toBe("failed");
    expect(evaluation.failures).toEqual([
      "sustainedMotion: expected RAF compute/write samples",
    ]);
  });

  it("uses the resize p95 budget for resize interactions", () => {
    const metrics = createEmptyWeekViewPerfPhaseMetrics();

    metrics.rafComputeWriteMs = [3.5, 3.8, 3.9];

    const evaluation = evaluateWeekViewPerfResult(
      createScenario({
        interaction: "resize",
        phases: {
          sustainedMotion: metrics,
        },
      }),
    );

    expect(evaluation.status).toBe("passed");
  });

  it("fails first-frame latency when a prototype budget is provided", () => {
    const metrics = addPassingRafSamples();

    metrics.firstFrameLatencyMs = 12;

    const evaluation = evaluateWeekViewPerfResult(
      createScenario({
        phases: {
          sustainedMotion: metrics,
        },
      }),
      {
        firstFrameLatencyPrototypeBaselineMs: 10,
      },
    );

    expect(evaluation.status).toBe("failed");
    expect(evaluation.failures).toEqual([
      "sustainedMotion: expected first frame latency <= 10ms, got 12ms",
    ]);
  });
});
