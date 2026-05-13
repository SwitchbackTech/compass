import {
  buildComparison,
  type PerfRunResult,
  validateLatestComparison,
} from "./week-view.perf-results";

const createRun = (overrides: Partial<PerfRunResult> = {}): PerfRunResult => ({
  baseUrl: "http://localhost:9160",
  git: {
    branch: "chore/add-week-view-performance-benchmark",
    commit: "abc1234",
    dirty: false,
  },
  label: "baseline",
  outputPath: "/tmp/baseline.json",
  runAt: "2026-05-13T00:00:00.000Z",
  runContext: {
    browserName: "chromium",
    browserVersion: "123.0.0",
    headless: true,
    platform: "darwin",
    scenarios: ["heavy-week-load"],
    viewport: { height: 1000, width: 1440 },
    warmupRuns: 1,
    weekStart: "2026-05-10",
  },
  runsPerScenario: 5,
  scenarios: [
    {
      averageMs: 105,
      longTaskCount: 2,
      maxFrameGapMs: 40,
      maxLongTaskMs: 75,
      maxMs: 140,
      medianMs: 100,
      minMs: 90,
      name: "heavy-week-load",
      p95Ms: 140,
      samples: [
        {
          durationMs: 100,
          longTaskCount: 2,
          maxFrameGapMs: 40,
          maxLongTaskMs: 75,
        },
      ],
    },
  ],
  ...overrides,
});

describe("week view performance results", () => {
  it("builds persisted before-and-after comparisons for speed and smoothness", () => {
    const baseline = createRun();
    const current = createRun({
      label: "after",
      scenarios: [
        {
          ...baseline.scenarios[0],
          longTaskCount: 1,
          maxFrameGapMs: 30,
          maxLongTaskMs: 50,
          medianMs: 80,
          p95Ms: 120,
        },
      ],
    });

    const comparison = buildComparison(baseline, current);

    expect(comparison?.baseline.label).toBe("baseline");
    expect(comparison?.scenarios).toEqual([
      {
        longTaskCount: { after: 1, before: 2, delta: -1, deltaPercent: -50 },
        maxFrameGapMs: { after: 30, before: 40, delta: -10, deltaPercent: -25 },
        maxLongTaskMs: {
          after: 50,
          before: 75,
          delta: -25,
          deltaPercent: -33.33333333333333,
        },
        medianMs: { after: 80, before: 100, delta: -20, deltaPercent: -20 },
        name: "heavy-week-load",
        p95Ms: {
          after: 120,
          before: 140,
          delta: -20,
          deltaPercent: -14.285714285714285,
        },
      },
    ]);
  });

  it("rejects latest comparisons from another branch", () => {
    const baseline = createRun({
      git: {
        branch: "main",
        commit: "def5678",
        dirty: false,
      },
    });
    const current = createRun();

    expect(() =>
      validateLatestComparison({
        baseline,
        compare: "latest",
        current,
        expectedScenarios: ["heavy-week-load"],
      }),
    ).toThrow("latest belongs to branch main");
  });

  it("rejects latest comparisons with different sample counts", () => {
    const baseline = createRun({ runsPerScenario: 1 });
    const current = createRun({ runsPerScenario: 5 });

    expect(() =>
      validateLatestComparison({
        baseline,
        compare: "latest",
        current,
        expectedScenarios: ["heavy-week-load"],
      }),
    ).toThrow("latest used 1 sample");
  });
});
