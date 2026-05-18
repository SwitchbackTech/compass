import {
  createEmptyWeekViewPerfPhaseMetrics,
  evaluateWeekViewPerfResult,
  maxOrZero,
  percentile,
  type WeekViewPerfScenarioResult,
} from "./week-view.perf-results";

interface PerfArgs {
  label: string;
  scenarios: string[];
}

const DEFAULT_SAMPLE_COUNT = 120;
const INPUT_BASELINE_SCENARIO = "input-baseline";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = await Promise.all(
    args.scenarios.map((scenario) => runScenario(scenario, args.label)),
  );
  const evaluations = results.map((result) =>
    evaluateWeekViewPerfResult(result),
  );
  const failed = evaluations.filter(
    (evaluation) => evaluation.status === "failed",
  );

  console.log(
    JSON.stringify(
      {
        evaluations,
        results: results.map(toPrintableResult),
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) {
    process.exit(1);
  }
}

const parseArgs = (argv: string[]): PerfArgs => {
  const scenarioArg =
    getOptionValue(argv, "--scenario") ?? INPUT_BASELINE_SCENARIO;
  const label = getOptionValue(argv, "--label") ?? "week-view-perf";

  return {
    label,
    scenarios: scenarioArg
      .split(",")
      .map((scenario) => scenario.trim())
      .filter(Boolean),
  };
};

const getOptionValue = (argv: string[], option: string) => {
  const index = argv.indexOf(option);

  if (index === -1) {
    return null;
  }

  return argv[index + 1] ?? null;
};

const runScenario = async (
  scenario: string,
  label: string,
): Promise<WeekViewPerfScenarioResult> => {
  if (scenario === INPUT_BASELINE_SCENARIO) {
    return runInputBaselineScenario(label);
  }

  return {
    enabled: false,
    interaction: "drag",
    label,
    phases: {},
    sampleCount: 0,
    scenario,
  };
};

const runInputBaselineScenario = async (
  label: string,
): Promise<WeekViewPerfScenarioResult> => {
  const metrics = createEmptyWeekViewPerfPhaseMetrics();

  metrics.frameGapsMs = await collectInputFloorSamples(DEFAULT_SAMPLE_COUNT);

  return {
    enabled: true,
    interaction: "input",
    label,
    phases: {
      sustainedMotion: metrics,
    },
    sampleCount: metrics.frameGapsMs.length,
    scenario: INPUT_BASELINE_SCENARIO,
  };
};

const collectInputFloorSamples = async (sampleCount: number) => {
  const samples: number[] = [];
  let previous = performance.now();

  for (let index = 0; index < sampleCount; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const current = performance.now();

    samples.push(current - previous);
    previous = current;
  }

  return samples;
};

const toPrintableResult = (result: WeekViewPerfScenarioResult) => {
  const sustainedMotion = result.phases.sustainedMotion;

  if (!sustainedMotion) {
    return result;
  }

  return {
    ...result,
    summary: {
      frameGapMaxMs: maxOrZero(sustainedMotion.frameGapsMs),
      frameGapP95Ms: percentile(sustainedMotion.frameGapsMs, 95),
      rafMaxMs: maxOrZero(sustainedMotion.rafComputeWriteMs),
      rafP95Ms: percentile(sustainedMotion.rafComputeWriteMs, 95),
    },
  };
};

await main();
