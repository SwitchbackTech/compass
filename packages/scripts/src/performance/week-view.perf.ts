import { chromium, type Locator, type Page } from "@playwright/test";
import {
  createEmptyWeekViewPerfPhaseMetrics,
  evaluateWeekViewPerfResult,
  maxOrZero,
  percentile,
  type WeekViewPerfInteraction,
  type WeekViewPerfPhase,
  type WeekViewPerfPhaseMetrics,
  type WeekViewPerfScenarioResult,
} from "./week-view.perf-results";
import { type ChildProcess, spawn } from "node:child_process";

interface PerfArgs {
  label: string;
  scenarios: string[];
}

interface WeekViewPerfFrameSample {
  firstFrameLatencyMs?: number;
  frameGapMs?: number;
  rafComputeWriteMs: number;
}

interface WeekViewPerfProbe {
  patchReduxStore: (store: WeekViewPerfStore | undefined) => void;
  recordCalendarInteractionFrame: (frame: WeekViewPerfFrameSample) => void;
  recordReactCommit: () => void;
  snapshot: () => Partial<Record<WeekViewPerfPhase, WeekViewPerfPhaseMetrics>>;
  startPhase: (phase: WeekViewPerfPhase) => void;
  stopPhase: () => void;
}

interface WeekViewPerfStore {
  __weekViewPerfDispatchPatched?: boolean;
  dispatch?: (action: unknown) => unknown;
}

type WeekViewPerfWindow = Window & {
  __COMPASS_E2E_STORE__?: WeekViewPerfStore;
  __WEEK_VIEW_PERF_PROBE__?: WeekViewPerfProbe;
};

const DEFAULT_SAMPLE_COUNT = 120;
const DEFAULT_WEEK_VIEW_PERF_URL = "http://localhost:9080/week";
const INPUT_BASELINE_SCENARIO = "input-baseline";
const BROWSER_SCENARIOS = new Set([
  "timed-drag-v2-sustained",
  "timed-drag-v2-pointerup-commit",
  "smart-scroll-drag-v2",
  "edge-navigation-timed-drag-v2",
  "timed-resize-v2-sustained-bottom",
  "timed-resize-v2-sustained-top",
  "timed-resize-v2-edge-flip",
]);
const TIMED_EVENT_SELECTOR =
  '[data-week-interaction-event-id][data-week-interaction-event-type="timed"]';
const OVERLAY_SELECTOR = "[data-calendar-interaction-overlay]";
const POINTER_ID = 1;

let startedWebServer: ChildProcess | null = null;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results: WeekViewPerfScenarioResult[] = [];

  for (const scenario of args.scenarios) {
    results.push(await runScenario(scenario, args.label));
  }

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
    process.exitCode = 1;
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

  if (BROWSER_SCENARIOS.has(scenario)) {
    return runBrowserScenario(scenario, label);
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

const runBrowserScenario = async (
  scenario: string,
  label: string,
): Promise<WeekViewPerfScenarioResult> => {
  await ensureWeekViewPerfServer();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: {
      height: 1000,
      width: 1440,
    },
  });

  try {
    await prepareWeekViewPerfPage(page);
    await runBrowserScenarioInteraction(page, scenario);

    const phases = await readBrowserPerfPhases(page);

    return {
      enabled: true,
      interaction: getBrowserScenarioInteraction(scenario),
      label,
      phases,
      sampleCount: getBrowserScenarioSampleCount(phases),
      scenario,
    };
  } finally {
    await browser.close();
  }
};

const ensureWeekViewPerfServer = async () => {
  const url = getWeekViewPerfUrl();

  if (await isUrlAvailable(url)) {
    return;
  }

  const parsedUrl = new URL(url);

  if (
    parsedUrl.hostname !== "localhost" &&
    parsedUrl.hostname !== "127.0.0.1"
  ) {
    throw new Error(
      `Week perf URL is unavailable and cannot be started automatically: ${url}`,
    );
  }

  startedWebServer = spawn("bun", ["run", "dev:web"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "ignore",
  });

  const timeoutAt = Date.now() + 120_000;

  while (Date.now() < timeoutAt) {
    if (startedWebServer.exitCode !== null) {
      throw new Error("Week perf dev server exited before it became ready.");
    }

    if (await isUrlAvailable(url)) {
      return;
    }

    await wait(500);
  }

  throw new Error(`Timed out waiting for Week perf URL: ${url}`);
};

const isUrlAvailable = async (url: string) => {
  try {
    const response = await fetch(url, { method: "HEAD" });

    return response.ok;
  } catch {
    return false;
  }
};

const getWeekViewPerfUrl = () =>
  process.env["WEEK_VIEW_PERF_URL"] ?? DEFAULT_WEEK_VIEW_PERF_URL;

const wait = (durationMs: number) =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

const prepareWeekViewPerfPage = async (page: Page) => {
  await page.addInitScript(() => {
    const perfWindow = window as WeekViewPerfWindow;
    const createMetrics = (): WeekViewPerfPhaseMetrics => ({
      domMutationsUnexpected: 0,
      frameGapsMs: [],
      longTasks: 0,
      rafComputeWriteMs: [],
      reactCommits: 0,
      reduxDispatches: 0,
      saveRequests: 0,
    });
    const phases: Partial<Record<WeekViewPerfPhase, WeekViewPerfPhaseMetrics>> =
      {};
    let activePhase: WeekViewPerfPhase | null = null;
    let mutationObserver: MutationObserver | null = null;

    const getPhaseMetrics = (phase = activePhase) => {
      if (!phase) {
        return null;
      }

      phases[phase] ??= createMetrics();

      return phases[phase];
    };

    const getElement = (node: Node) =>
      node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;

    const isOverlayNode = (node: Node) => {
      const element = getElement(node);

      return (
        element?.matches("[data-calendar-interaction-overlay]") ||
        Boolean(element?.closest("[data-calendar-interaction-overlay]"))
      );
    };

    const isPlaceholderNode = (node: Node) => {
      const element = getElement(node);

      return Boolean(
        element?.hasAttribute("data-calendar-interaction-placeholder") ||
          element?.hasAttribute("data-week-interaction-event-id"),
      );
    };

    const isAllowedMutation = (mutation: MutationRecord) => {
      if (isOverlayNode(mutation.target)) {
        return true;
      }

      if (
        mutation.type === "childList" &&
        [...mutation.addedNodes, ...mutation.removedNodes].every(isOverlayNode)
      ) {
        return true;
      }

      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "style" ||
          mutation.attributeName === "data-calendar-interaction-placeholder") &&
        isPlaceholderNode(mutation.target)
      ) {
        return true;
      }

      return false;
    };

    const startMutationObserver = () => {
      mutationObserver?.disconnect();
      mutationObserver = new MutationObserver((mutations) => {
        const metrics = getPhaseMetrics();

        if (!metrics) {
          return;
        }

        for (const mutation of mutations) {
          if (!isAllowedMutation(mutation)) {
            metrics.domMutationsUnexpected += 1;
          }
        }
      });
      mutationObserver.observe(document.body, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    };

    const originalFetch = window.fetch.bind(window);

    const measuredFetch = (...args: Parameters<typeof window.fetch>) => {
      const metrics = getPhaseMetrics();

      if (metrics) {
        metrics.saveRequests += 1;
      }

      return originalFetch(...args);
    };
    window.fetch = Object.assign(measuredFetch, window.fetch);

    if ("PerformanceObserver" in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const metrics = getPhaseMetrics();

          if (metrics) {
            metrics.longTasks += list.getEntries().length;
          }
        });

        longTaskObserver.observe({
          entryTypes: ["longtask"],
        } as PerformanceObserverInit);
      } catch {
        // Browser does not support longtask entries in every environment.
      }
    }

    perfWindow.__WEEK_VIEW_PERF_PROBE__ = {
      patchReduxStore(store) {
        if (!store?.dispatch || store.__weekViewPerfDispatchPatched) {
          return;
        }

        const originalDispatch = store.dispatch.bind(store);
        store.__weekViewPerfDispatchPatched = true;
        store.dispatch = (action) => {
          const metrics = getPhaseMetrics();

          if (metrics) {
            metrics.reduxDispatches += 1;
          }

          return originalDispatch(action);
        };
      },
      recordCalendarInteractionFrame(frame) {
        const metrics = getPhaseMetrics();

        if (!metrics) {
          return;
        }

        const hasPhaseRafSample = metrics.rafComputeWriteMs.length > 0;

        if (hasPhaseRafSample && frame.frameGapMs !== undefined) {
          metrics.frameGapsMs.push(frame.frameGapMs);
        }

        metrics.rafComputeWriteMs.push(frame.rafComputeWriteMs);

        if (
          frame.firstFrameLatencyMs !== undefined &&
          metrics.firstFrameLatencyMs === undefined
        ) {
          metrics.firstFrameLatencyMs = frame.firstFrameLatencyMs;
        }
      },
      recordReactCommit() {
        const metrics = getPhaseMetrics();

        if (metrics) {
          metrics.reactCommits += 1;
        }
      },
      snapshot() {
        return phases;
      },
      startPhase(phase) {
        activePhase = phase;
        getPhaseMetrics(phase);
        startMutationObserver();
      },
      stopPhase() {
        mutationObserver?.disconnect();
        mutationObserver = null;
        activePhase = null;
      },
    };
  });

  await page.goto(getWeekViewPerfUrl(), { waitUntil: "domcontentloaded" });
  await page
    .locator("#mainGrid")
    .waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(
    () =>
      typeof (window as WeekViewPerfWindow).__COMPASS_E2E_STORE__?.dispatch ===
      "function",
    undefined,
    { timeout: 30_000 },
  );
  await page.evaluate(() => {
    const perfWindow = window as WeekViewPerfWindow;

    perfWindow.__WEEK_VIEW_PERF_PROBE__?.patchReduxStore(
      perfWindow.__COMPASS_E2E_STORE__,
    );
  });
  await page
    .locator(TIMED_EVENT_SELECTOR)
    .first()
    .waitFor({ state: "visible", timeout: 30_000 });
};

const runBrowserScenarioInteraction = async (page: Page, scenario: string) => {
  switch (scenario) {
    case "timed-drag-v2-sustained":
      await runTimedDragSustainedScenario(page);
      return;
    case "timed-drag-v2-pointerup-commit":
      await runTimedDragPointerupCommitScenario(page);
      return;
    case "smart-scroll-drag-v2":
      await runSmartScrollDragScenario(page);
      return;
    case "edge-navigation-timed-drag-v2":
      await runTimedEdgeNavigationScenario(page);
      return;
    case "timed-resize-v2-sustained-bottom":
      await runTimedResizeScenario(page, "endDate", 80);
      return;
    case "timed-resize-v2-sustained-top":
      await runTimedResizeScenario(page, "startDate", -80);
      return;
    case "timed-resize-v2-edge-flip":
      await runTimedResizeScenario(page, "endDate", -120);
      return;
    default:
      throw new Error(`Unhandled Week browser perf scenario: ${scenario}`);
  }
};

const runTimedDragSustainedScenario = async (page: Page) => {
  const start = await activateTimedDrag(page);

  await startBrowserPerfPhase(page, "sustainedMotion");
  const end = await movePointerInFrames(page, start.x, start.y + 45, 0, 75);
  await stopBrowserPerfPhase(page);
  await dispatchPointerEvent(page, "pointerup", end.x, end.y);
  await page.waitForTimeout(250);
};

const runTimedDragPointerupCommitScenario = async (page: Page) => {
  const start = await activateTimedDrag(page);

  await startBrowserPerfPhase(page, "sustainedMotion");
  const end = await movePointerInFrames(page, start.x, start.y + 45, 0, 60);
  await stopBrowserPerfPhase(page);
  await startBrowserPerfPhase(page, "commit");
  await dispatchPointerEvent(page, "pointerup", end.x, end.y);
  await page.waitForTimeout(350);
  await stopBrowserPerfPhase(page);
};

const runSmartScrollDragScenario = async (page: Page) => {
  const start = await activateTimedDrag(page);
  const mainGridBox = await requireBox(page.locator("#mainGrid"), "main grid");
  const edgeY = mainGridBox.y + mainGridBox.height - 20;

  await startBrowserPerfPhase(page, "sustainedMotion");
  await dispatchPointerEvent(page, "pointermove", start.x, edgeY);
  await waitFrames(page, 18);
  await stopBrowserPerfPhase(page);
  await dispatchPointerEvent(page, "pointerup", start.x, edgeY);
  await page.waitForTimeout(250);
};

const runTimedEdgeNavigationScenario = async (page: Page) => {
  const start = await activateTimedDrag(page);
  const mainGridBox = await requireBox(page.locator("#mainGrid"), "main grid");
  const edgeX = mainGridBox.x + 20;
  const edgeY = Math.min(
    mainGridBox.y + mainGridBox.height - 120,
    Math.max(mainGridBox.y + 120, start.y),
  );
  const safeX = mainGridBox.x + mainGridBox.width / 2;
  const safeY = edgeY;

  await dispatchPointerEvent(page, "pointermove", safeX, safeY);
  await waitFrames(page, 2);

  await startBrowserPerfPhase(page, "preNavigationSustainedMotion");
  await movePointerInFrames(page, safeX, safeY, 0, 25, 4);
  await stopBrowserPerfPhase(page);

  await runEdgeNavigationDwellAndStartRenderPhase(page, edgeX, edgeY);
  await page.waitForTimeout(700);
  await stopBrowserPerfPhase(page);

  await startBrowserPerfPhase(page, "postNavigationSustainedMotion");
  const end = await movePointerInFrames(page, edgeX, edgeY, 70, 0, 4);
  await stopBrowserPerfPhase(page);
  await dispatchPointerEvent(page, "pointerup", end.x, end.y);
  await page.waitForTimeout(250);
};

const runTimedResizeScenario = async (
  page: Page,
  edge: "endDate" | "startDate",
  deltaY: number,
) => {
  const start = await activateTimedResize(page, edge, deltaY > 0 ? 35 : -35);

  await startBrowserPerfPhase(page, "sustainedMotion");
  const end = await movePointerInFrames(
    page,
    start.x,
    start.y + Math.sign(deltaY) * 35,
    0,
    deltaY,
  );
  await stopBrowserPerfPhase(page);
  await dispatchPointerEvent(page, "pointerup", end.x, end.y);
  await page.waitForTimeout(250);
};

const activateTimedDrag = async (page: Page) => {
  const event = page.locator(TIMED_EVENT_SELECTOR).first();

  await event.scrollIntoViewIfNeeded();
  const box = await requireBox(event, "timed event");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await dispatchPointerEvent(page, "pointermove", x, y);
  await dispatchPointerEvent(page, "pointerdown", x, y, TIMED_EVENT_SELECTOR);
  await dispatchPointerEvent(page, "pointermove", x, y + 40);
  await page
    .locator(OVERLAY_SELECTOR)
    .waitFor({ state: "visible", timeout: 5_000 });

  return { x, y };
};

const activateTimedResize = async (
  page: Page,
  edge: "endDate" | "startDate",
  activationDeltaY: number,
) => {
  const event = page.locator(TIMED_EVENT_SELECTOR).first();

  await event.scrollIntoViewIfNeeded();
  const handle = event.locator(`[data-week-event-resize-handle="${edge}"]`);
  const handleSelector = `${TIMED_EVENT_SELECTOR} [data-week-event-resize-handle="${edge}"]`;
  const box = await requireBox(handle, `timed ${edge} resize handle`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await dispatchPointerEvent(page, "pointermove", x, y);
  await dispatchPointerEvent(page, "pointerdown", x, y, handleSelector);
  await dispatchPointerEvent(page, "pointermove", x, y + activationDeltaY);
  await page
    .locator(OVERLAY_SELECTOR)
    .waitFor({ state: "visible", timeout: 5_000 });

  return { x, y };
};

const startBrowserPerfPhase = (page: Page, phase: WeekViewPerfPhase) =>
  page.evaluate((phaseName) => {
    (window as WeekViewPerfWindow).__WEEK_VIEW_PERF_PROBE__?.startPhase(
      phaseName,
    );
  }, phase);

const stopBrowserPerfPhase = (page: Page) =>
  page.evaluate(() => {
    (window as WeekViewPerfWindow).__WEEK_VIEW_PERF_PROBE__?.stopPhase();
  });

const movePointerInFrames = async (
  page: Page,
  startX: number,
  startY: number,
  deltaX: number,
  deltaY: number,
  steps = 12,
) => {
  return page.evaluate(
    async ({ deltaX, deltaY, pointerId, startX, startY, steps }) => {
      let x = startX;
      let y = startY;

      for (let step = 1; step <= steps; step += 1) {
        x = startX + (deltaX * step) / steps;
        y = startY + (deltaY * step) / steps;

        const target = document.elementFromPoint(x, y);

        if (!target) {
          throw new Error("Could not find pointer target for pointermove.");
        }

        target.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            button: -1,
            buttons: 1,
            cancelable: true,
            clientX: x,
            clientY: y,
            composed: true,
            isPrimary: true,
            pointerId,
            pointerType: "mouse",
          }),
        );

        await new Promise(requestAnimationFrame);
      }

      return { x, y };
    },
    { deltaX, deltaY, pointerId: POINTER_ID, startX, startY, steps },
  );
};

const dispatchPointerEvent = (
  page: Page,
  type: "pointerdown" | "pointermove" | "pointerup",
  x: number,
  y: number,
  targetSelector?: string,
) =>
  page.evaluate(
    ({ eventType, pointerId, targetSelector, x, y }) => {
      const target =
        targetSelector !== undefined
          ? document.querySelector(targetSelector)
          : document.elementFromPoint(x, y);

      if (!target) {
        throw new Error(`Could not find pointer target for ${eventType}.`);
      }

      target.dispatchEvent(
        new PointerEvent(eventType, {
          bubbles: true,
          button: eventType === "pointermove" ? -1 : 0,
          buttons: eventType === "pointerup" ? 0 : 1,
          cancelable: true,
          clientX: x,
          clientY: y,
          composed: true,
          isPrimary: true,
          pointerId,
          pointerType: "mouse",
        }),
      );
    },
    { eventType: type, pointerId: POINTER_ID, targetSelector, x, y },
  );

const runEdgeNavigationDwellAndStartRenderPhase = (
  page: Page,
  x: number,
  y: number,
) =>
  page.evaluate(
    async ({ pointerId, x, y }) => {
      const perfWindow = window as WeekViewPerfWindow;
      const target = document.elementFromPoint(x, y);

      if (!target) {
        throw new Error(
          "Could not find pointer target for edge navigation dwell.",
        );
      }

      perfWindow.__WEEK_VIEW_PERF_PROBE__?.startPhase("edgeNavigationDwell");
      target.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          button: -1,
          buttons: 1,
          cancelable: true,
          clientX: x,
          clientY: y,
          composed: true,
          isPrimary: true,
          pointerId,
          pointerType: "mouse",
        }),
      );

      for (let frame = 0; frame < 18; frame += 1) {
        await new Promise(requestAnimationFrame);
      }

      perfWindow.__WEEK_VIEW_PERF_PROBE__?.stopPhase();
      perfWindow.__WEEK_VIEW_PERF_PROBE__?.startPhase("edgeNavigationRender");
    },
    { pointerId: POINTER_ID, x, y },
  );

const waitFrames = (page: Page, frameCount: number) =>
  page.evaluate(async (count) => {
    for (let frame = 0; frame < count; frame += 1) {
      await new Promise(requestAnimationFrame);
    }
  }, frameCount);

const requireBox = async (locator: Locator, label: string) => {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error(`Expected visible bounding box for ${label}.`);
  }

  return box;
};

const readBrowserPerfPhases = async (page: Page) => {
  const phases = await page.evaluate(() =>
    (window as WeekViewPerfWindow).__WEEK_VIEW_PERF_PROBE__?.snapshot(),
  );

  return (phases ?? {}) as Partial<
    Record<WeekViewPerfPhase, WeekViewPerfPhaseMetrics>
  >;
};

const getBrowserScenarioInteraction = (
  scenario: string,
): WeekViewPerfInteraction =>
  scenario.startsWith("timed-resize") ? "resize" : "drag";

const getBrowserScenarioSampleCount = (
  phases: Partial<Record<WeekViewPerfPhase, WeekViewPerfPhaseMetrics>>,
) =>
  Object.values(phases).reduce(
    (total, metrics) => total + (metrics?.rafComputeWriteMs.length ?? 0),
    0,
  );

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
    await wait(0);

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

const stopStartedWebServer = () => {
  const server: ChildProcess | null = startedWebServer;

  startedWebServer = null;
  server?.kill();
};

try {
  await main();
} finally {
  stopStartedWebServer();
}
