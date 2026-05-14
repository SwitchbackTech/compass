import {
  type Browser,
  type BrowserContext,
  chromium,
  type Page,
} from "playwright";
import {
  type BrowserMetricSummary,
  buildComparison,
  getLatestPath,
  type PerfRunResult,
  type RunContext,
  resolveComparePath,
  type ScenarioResult,
  type ScenarioSample,
  validateLatestComparison,
  type WeekInteractionMetricSummary,
} from "./week-view.perf-results";
import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

type StoredPerfEvent = {
  _id: string;
  allDayOrder?: number;
  endDate: string;
  isAllDay: boolean;
  isSomeday: false;
  order?: number;
  origin: "compass";
  priority: "unassigned" | "work" | "self" | "relationships";
  startDate: string;
  title: string;
  updatedAt: string;
  user: string;
};

type CliOptions = {
  baseUrl?: string;
  compare?: string;
  headed: boolean;
  label: string;
  note?: string;
  outputDir: string;
  port: number;
  runs: number;
  scenarios: Set<string>;
  warmups: number;
};

type ScenarioDefinition = {
  isolateSamples?: boolean;
  name: string;
  run: (page: Page, baseUrl: string) => Promise<ScenarioSample>;
};

type ServerHandle = {
  baseUrl: string;
  stop: () => Promise<void>;
};

type ScenarioPage = {
  page: Page;
};

const REPO_ROOT = path.resolve(import.meta.dir, "../../../..");
const WEB_ROOT = path.join(REPO_ROOT, "packages/web");
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, "tmp/perf/week-view");
const LOCAL_DB_NAME = "compass-local";
const DEFAULT_RUNS = 5;
const DEFAULT_WARMUPS = 1;
const DEFAULT_PORT = 9160;
const FORM_TIMEOUT_MS = 10_000;
const FORM_OPEN_ATTEMPT_TIMEOUT_MS = 1_000;
const SERVER_TIMEOUT_MS = 120_000;
const VIEWPORT = { width: 1440, height: 1000 };

function getWeekStart(date = new Date()) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  return weekStart;
}

const RUN_WEEK_START = getWeekStart();
const RUN_WEEK_START_LABEL = RUN_WEEK_START.toISOString().slice(0, 10);

const writeOut = (message = "") => {
  process.stdout.write(`${message}\n`);
};

const writeErr = (message = "") => {
  process.stderr.write(`${message}\n`);
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const getArgValue = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

const hasFlag = (args: string[], name: string) => args.includes(name);

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  optionName: string,
) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  return parsed;
};

const parseNonNegativeInteger = (
  value: string | undefined,
  fallback: number,
  optionName: string,
) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${optionName} must be a non-negative integer.`);
  }

  return parsed;
};

const parseOptions = (): CliOptions => {
  const args = process.argv.slice(2);
  const scenarioNames = getArgValue(args, "--scenario")
    ?.split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return {
    baseUrl: getArgValue(args, "--base-url"),
    compare: getArgValue(args, "--compare"),
    headed: hasFlag(args, "--headed"),
    label: getArgValue(args, "--label") ?? `run-${Date.now()}`,
    note: getArgValue(args, "--note"),
    outputDir: path.resolve(
      getArgValue(args, "--output-dir") ?? DEFAULT_OUTPUT_DIR,
    ),
    port: parsePositiveInteger(
      getArgValue(args, "--port"),
      DEFAULT_PORT,
      "--port",
    ),
    runs: parsePositiveInteger(
      getArgValue(args, "--runs"),
      DEFAULT_RUNS,
      "--runs",
    ),
    scenarios: new Set(scenarioNames),
    warmups: parseNonNegativeInteger(
      getArgValue(args, "--warmups"),
      DEFAULT_WARMUPS,
      "--warmups",
    ),
  };
};

const getGitValue = (args: string[]) =>
  execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();

const getOptionalCommandValue = (command: string, args: string[]) => {
  try {
    return execFileSync(command, args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return undefined;
  }
};

const getGitInfo = () => {
  const branch = getGitValue(["branch", "--show-current"]) || "detached";
  const commit = getGitValue(["rev-parse", "--short", "HEAD"]);
  const dirty =
    getGitValue(["status", "--short", "--untracked-files=no"]).length > 0;

  return { branch, commit, dirty };
};

const createRunContext = (
  browser: Browser,
  options: CliOptions,
  scenarios: ScenarioDefinition[],
): RunContext => ({
  browserName: "chromium",
  browserVersion: browser.version(),
  bunVersion: getOptionalCommandValue("bun", ["--version"]),
  headless: !options.headed,
  nodeVersion: process.version,
  platform: process.platform,
  scenarios: scenarios.map((scenario) => scenario.name),
  viewport: VIEWPORT,
  warmupRuns: options.warmups,
  weekStart: RUN_WEEK_START_LABEL,
});

const toSafeLabel = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "run";

const median = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  }

  return sorted[middle] ?? 0;
};

const percentile = (values: number[], percentileValue: number) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );

  return sorted[index] ?? 0;
};

const average = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const summarizeScenario = (
  name: string,
  samples: ScenarioSample[],
): ScenarioResult => {
  const durations = samples.map((sample) => sample.durationMs);
  const frameGaps = samples.map((sample) => sample.maxFrameGapMs);
  const longTasks = samples.map((sample) => sample.maxLongTaskMs);

  return {
    averageMs: average(durations),
    longTaskCount: samples.reduce(
      (count, sample) => count + sample.longTaskCount,
      0,
    ),
    maxFrameGapMs: Math.max(0, ...frameGaps),
    maxLongTaskMs: Math.max(0, ...longTasks),
    maxMs: Math.max(0, ...durations),
    medianMs: median(durations),
    minMs: Math.min(...durations),
    name,
    p95Ms: percentile(durations, 95),
    samples,
    weekInteraction: summarizeWeekInteractionSamples(samples),
  };
};

const maxMetric = (values: number[]) => Math.max(0, ...values);

const uniqueStrings = (values: string[]) => [...new Set(values)];

const summarizeWeekInteractionSamples = (
  samples: ScenarioSample[],
): WeekInteractionMetricSummary | undefined => {
  const summaries = samples
    .map((sample) => sample.weekInteraction)
    .filter((summary): summary is WeekInteractionMetricSummary =>
      Boolean(summary),
    );

  if (summaries.length === 0) {
    return undefined;
  }

  return {
    available: summaries.some((summary) => summary.available),
    domMutationsDuringMotion: maxMetric(
      summaries.map((summary) => summary.domMutationsDuringMotion),
    ),
    firstFrameLatencyMs:
      maxMetric(
        summaries.flatMap((summary) =>
          summary.firstFrameLatencyMs === null
            ? []
            : [summary.firstFrameLatencyMs],
        ),
      ) || null,
    layoutReadsDuringMotion: maxMetric(
      summaries.map((summary) => summary.layoutReadsDuringMotion),
    ),
    overlayMountMs:
      maxMetric(
        summaries.flatMap((summary) =>
          summary.overlayMountMs === null ? [] : [summary.overlayMountMs],
        ),
      ) || null,
    pointerMoveCount: maxMetric(
      summaries.map((summary) => summary.pointerMoveCount),
    ),
    rafCount: maxMetric(summaries.map((summary) => summary.rafCount)),
    rafDurationMaxMs: maxMetric(
      summaries.map((summary) => summary.rafDurationMaxMs),
    ),
    rafDurationP95Ms: maxMetric(
      summaries.map((summary) => summary.rafDurationP95Ms),
    ),
    reactCommitDurationsDuringMotion: summaries.flatMap(
      (summary) => summary.reactCommitDurationsDuringMotion,
    ),
    reactCommitsDuringMotion: maxMetric(
      summaries.map((summary) => summary.reactCommitsDuringMotion),
    ),
    reduxActionTypesDuringMotion: uniqueStrings(
      summaries.flatMap((summary) => summary.reduxActionTypesDuringMotion),
    ),
    reduxDispatchesDuringMotion: maxMetric(
      summaries.map((summary) => summary.reduxDispatchesDuringMotion),
    ),
    saveRequestsAfterPointerUp: maxMetric(
      summaries.map((summary) => summary.saveRequestsAfterPointerUp),
    ),
    saveRequestsDuringMotion: maxMetric(
      summaries.map((summary) => summary.saveRequestsDuringMotion),
    ),
    styleWritesDuringMotion: maxMetric(
      summaries.map((summary) => summary.styleWritesDuringMotion),
    ),
    unexpectedDomMutationTargets: uniqueStrings(
      summaries.flatMap((summary) => summary.unexpectedDomMutationTargets),
    ),
    unexpectedDomMutationsDuringMotion: maxMetric(
      summaries.map((summary) => summary.unexpectedDomMutationsDuringMotion),
    ),
  };
};

const waitForServer = async (baseUrl: string) => {
  const start = Date.now();

  while (Date.now() - start < SERVER_TIMEOUT_MS) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the app server is ready.
    }

    await sleep(250);
  }

  throw new Error(`Timed out waiting for ${baseUrl}.`);
};

const startServer = async (options: CliOptions): Promise<ServerHandle> => {
  if (options.baseUrl) {
    return {
      baseUrl: options.baseUrl.replace(/\/$/, ""),
      stop: async () => undefined,
    };
  }

  const baseUrl = `http://localhost:${options.port}`;
  const server: ChildProcess = spawn("bun", ["run", "dev.ts"], {
    cwd: WEB_ROOT,
    env: {
      ...process.env,
      BASEURL: "http://localhost:3000/api",
      GOOGLE_CLIENT_ID: "test-client-id",
      NODE_ENV: "test",
      POSTHOG_HOST: "https://app.posthog.com",
      POSTHOG_KEY: "test-posthog-key",
      WEB_PORT: String(options.port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.on("exit", (code) => {
    if (code !== null && code !== 0) {
      writeErr(`Week performance server exited with code ${code}.`);
    }
  });

  await waitForServer(baseUrl);

  return {
    baseUrl,
    stop: async () => {
      if (!server || server.killed) {
        return;
      }

      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          server.kill("SIGKILL");
          resolve();
        }, 2_000);

        server.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });

        server.kill("SIGTERM");
      });
    },
  };
};

const waitForSettledFrames = async (page: Page) => {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );
};

const newScenarioContext = (browser: Browser) =>
  browser.newContext({
    viewport: VIEWPORT,
  });

const newScenarioPage = async (
  context: BrowserContext,
): Promise<ScenarioPage> => {
  const page = await context.newPage();
  await page.addInitScript(() => {
    (
      window as Window & { __COMPASS_E2E_TEST__?: boolean }
    ).__COMPASS_E2E_TEST__ = true;
  });

  return { page };
};

const startBrowserMetrics = async (page: Page) => {
  await page.evaluate(() => {
    type CompassPerfState = {
      frameGaps: number[];
      longTasks: number[];
      observer?: PerformanceObserver;
    };

    const perfWindow = window as Window & {
      __compassPerf?: CompassPerfState;
    };
    const state: CompassPerfState = { frameGaps: [], longTasks: [] };

    perfWindow.__compassPerf?.observer?.disconnect();
    perfWindow.__compassPerf = state;

    let lastFrame = performance.now();
    const trackFrame = (now: number) => {
      if (perfWindow.__compassPerf !== state) {
        return;
      }

      state.frameGaps.push(now - lastFrame);
      lastFrame = now;
      requestAnimationFrame(trackFrame);
    };

    requestAnimationFrame(trackFrame);

    try {
      state.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.longTasks.push(entry.duration);
        }
      });
      state.observer.observe({ entryTypes: ["longtask"] });
    } catch {
      state.longTasks = [];
    }
  });
};

const stopBrowserMetrics = async (
  page: Page,
): Promise<BrowserMetricSummary> => {
  return page.evaluate(() => {
    type CompassPerfState = {
      frameGaps: number[];
      longTasks: number[];
      observer?: PerformanceObserver;
    };

    const perfWindow = window as Window & {
      __compassPerf?: CompassPerfState;
    };
    const state = perfWindow.__compassPerf;
    perfWindow.__compassPerf = undefined;
    state?.observer?.disconnect();

    const frameGaps = state?.frameGaps ?? [];
    const longTasks = state?.longTasks ?? [];
    const weekWindow = window as Window & {
      __weekInteractionMetrics?: {
        active: boolean;
        domMutationsDuringMotion: number;
        firstFrameLatencyMs: number | null;
        layoutReadsDuringMotion: number;
        overlayMountMs: number | null;
        phase: "idle" | "pending" | "motion" | "commit";
        pointerMoveCount: number;
        rafCount: number;
        rafDurations: number[];
        reactCommitDurationsDuringMotion: number[];
        reactCommitsDuringMotion: number;
        reduxActionTypesDuringMotion: string[];
        reduxDispatchesDuringMotion: number;
        saveRequestsAfterPointerUp: number;
        saveRequestsDuringMotion: number;
        styleWritesDuringMotion: number;
        unexpectedDomMutationsDuringMotion: string[];
      };
    };
    const weekInteractionMetrics = weekWindow.__weekInteractionMetrics;

    const percentileValue = (values: number[], percentile: number) => {
      if (values.length === 0) {
        return 0;
      }

      const sorted = [...values].sort((left, right) => left - right);
      const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1),
      );

      return sorted[index] ?? 0;
    };

    return {
      longTaskCount: longTasks.length,
      maxFrameGapMs: Math.max(0, ...frameGaps),
      maxLongTaskMs: Math.max(0, ...longTasks),
      weekInteraction: {
        available: Boolean(weekInteractionMetrics),
        domMutationsDuringMotion:
          weekInteractionMetrics?.domMutationsDuringMotion ?? 0,
        firstFrameLatencyMs:
          weekInteractionMetrics?.firstFrameLatencyMs ?? null,
        layoutReadsDuringMotion:
          weekInteractionMetrics?.layoutReadsDuringMotion ?? 0,
        overlayMountMs: weekInteractionMetrics?.overlayMountMs ?? null,
        pointerMoveCount: weekInteractionMetrics?.pointerMoveCount ?? 0,
        rafCount: weekInteractionMetrics?.rafCount ?? 0,
        rafDurationMaxMs: Math.max(
          0,
          ...(weekInteractionMetrics?.rafDurations ?? []),
        ),
        rafDurationP95Ms: percentileValue(
          weekInteractionMetrics?.rafDurations ?? [],
          95,
        ),
        reactCommitDurationsDuringMotion:
          weekInteractionMetrics?.reactCommitDurationsDuringMotion ?? [],
        reactCommitsDuringMotion:
          weekInteractionMetrics?.reactCommitsDuringMotion ?? 0,
        reduxActionTypesDuringMotion:
          weekInteractionMetrics?.reduxActionTypesDuringMotion ?? [],
        reduxDispatchesDuringMotion:
          weekInteractionMetrics?.reduxDispatchesDuringMotion ?? 0,
        saveRequestsAfterPointerUp:
          weekInteractionMetrics?.saveRequestsAfterPointerUp ?? 0,
        saveRequestsDuringMotion:
          weekInteractionMetrics?.saveRequestsDuringMotion ?? 0,
        styleWritesDuringMotion:
          weekInteractionMetrics?.styleWritesDuringMotion ?? 0,
        unexpectedDomMutationTargets:
          weekInteractionMetrics?.unexpectedDomMutationsDuringMotion ?? [],
        unexpectedDomMutationsDuringMotion:
          weekInteractionMetrics?.unexpectedDomMutationsDuringMotion.length ??
          0,
      },
    };
  });
};

const measureAction = async (
  page: Page,
  action: () => Promise<void>,
): Promise<ScenarioSample> => {
  await startBrowserMetrics(page);
  const start = performance.now();

  await action();
  await waitForSettledFrames(page);

  const durationMs = performance.now() - start;
  const browserMetrics = await stopBrowserMetrics(page);

  return { ...browserMetrics, durationMs };
};

const seedCalendarEvents = async (page: Page, events: StoredPerfEvent[]) => {
  await page.evaluate(
    async ({ dbName, seededEvents }) => {
      const openDb = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(dbName);

          request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains("events")) {
              db.createObjectStore("events", { keyPath: "_id" });
            }

            if (!db.objectStoreNames.contains("tasks")) {
              db.createObjectStore("tasks", { keyPath: "_id" });
            }

            if (!db.objectStoreNames.contains("_migrations")) {
              db.createObjectStore("_migrations", { keyPath: "id" });
            }
          };

          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });

      const db = await openDb();

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(["events", "tasks"], "readwrite");
        const eventsStore = transaction.objectStore("events");
        const tasksStore = transaction.objectStore("tasks");

        eventsStore.clear();
        tasksStore.clear();

        for (const event of seededEvents) {
          eventsStore.put(event);
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });

      db.close();
    },
    { dbName: LOCAL_DB_NAME, seededEvents: events },
  );
};

const waitForWeekReady = async (
  page: Page,
  expected: { allDay: number; timed: number } = { allDay: 0, timed: 0 },
) => {
  await page
    .locator("#mainGrid")
    .waitFor({ state: "visible", timeout: 15_000 });
  await page
    .locator("#timedEvents")
    .waitFor({ state: "attached", timeout: 15_000 });

  try {
    await page.waitForFunction(
      ({ expectedAllDay, expectedTimed }) => {
        const timedEvents = document.querySelectorAll(
          '#timedEvents > [role="button"][data-event-id]',
        );
        const allDayEvents = document.querySelectorAll(
          '#allDayEvents [role="button"][data-event-id]',
        );

        return (
          timedEvents.length >= expectedTimed &&
          allDayEvents.length >= expectedAllDay
        );
      },
      { expectedAllDay: expected.allDay, expectedTimed: expected.timed },
      { timeout: 15_000 },
    );
  } catch (error) {
    const counts = await page.evaluate(() => ({
      allDay: document.querySelectorAll(
        '#allDayEvents [role="button"][data-event-id]',
      ).length,
      timed: document.querySelectorAll(
        '#timedEvents > [role="button"][data-event-id]',
      ).length,
    }));
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Timed out waiting for week events. Expected ${expected.timed} timed/${expected.allDay} all-day, found ${counts.timed} timed/${counts.allDay} all-day. ${message}`,
    );
  }

  await waitForSettledFrames(page);
};

const prepareCalendarState = async (
  page: Page,
  baseUrl: string,
  events: StoredPerfEvent[],
) => {
  await page.goto(`${baseUrl}/week`, { waitUntil: "domcontentloaded" });
  await waitForWeekReady(page);

  await page.evaluate(() => {
    localStorage.removeItem("compass.auth");
  });
  await seedCalendarEvents(page, events);
};

const objectIdFromNumber = (value: number) =>
  value.toString(16).padStart(24, "0").slice(-24);

const toDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createLocalDate = (
  weekStart: Date,
  dayOffset: number,
  minuteOfDay: number,
) => {
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + dayOffset);
  date.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);

  return date;
};

const getPerfWeekStart = () => new Date(RUN_WEEK_START);

const createTimedEvent = (
  index: number,
  weekStart: Date,
  dayOffset: number,
  startMinute: number,
  durationMinutes: number,
  title = `Perf timed event ${index}`,
): StoredPerfEvent => {
  const startDate = createLocalDate(weekStart, dayOffset, startMinute);
  const endDate = createLocalDate(
    weekStart,
    dayOffset,
    startMinute + durationMinutes,
  );

  return {
    _id: objectIdFromNumber(index + 1),
    endDate: endDate.toISOString(),
    isAllDay: false,
    isSomeday: false,
    origin: "compass",
    priority: index % 3 === 0 ? "work" : "unassigned",
    startDate: startDate.toISOString(),
    title,
    updatedAt: new Date().toISOString(),
    user: "perf-user",
  };
};

const createAllDayEvent = (
  index: number,
  weekStart: Date,
  dayOffset: number,
  spanDays = 0,
): StoredPerfEvent => {
  const startDate = new Date(weekStart);
  startDate.setDate(weekStart.getDate() + dayOffset);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + spanDays);

  return {
    _id: objectIdFromNumber(10_000 + index),
    allDayOrder: index,
    endDate: toDateOnly(endDate),
    isAllDay: true,
    isSomeday: false,
    order: index,
    origin: "compass",
    priority: "relationships",
    startDate: toDateOnly(startDate),
    title: `Perf all-day event ${index}`,
    updatedAt: new Date().toISOString(),
    user: "perf-user",
  };
};

const createHeavyWeekEvents = () => {
  const weekStart = getPerfWeekStart();
  const timedEvents: StoredPerfEvent[] = [];
  const allDayEvents: StoredPerfEvent[] = [];

  for (let day = 0; day < 7; day += 1) {
    for (let slot = 0; slot < 12; slot += 1) {
      const startMinute = 8 * 60 + (slot % 6) * 30 + Math.floor(slot / 6) * 15;
      const durationMinutes = 45 + (slot % 3) * 15;
      timedEvents.push(
        createTimedEvent(
          timedEvents.length,
          weekStart,
          day,
          startMinute,
          durationMinutes,
        ),
      );
    }

    if (day > 0) {
      allDayEvents.push(createAllDayEvent(allDayEvents.length, weekStart, day));
    }
  }

  return { allDayEvents, timedEvents };
};

const createSingleDragEvent = () => {
  const weekStart = getPerfWeekStart();
  return createTimedEvent(
    50_000,
    weekStart,
    2,
    10 * 60,
    60,
    "Perf drag target",
  );
};

const getFormTitleInput = (page: Page) =>
  page.getByRole("form").getByPlaceholder("Title");

const pressShortcut = async (page: Page, key: string) => {
  await page.evaluate((shortcut) => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: shortcut,
      }),
    );
    document.dispatchEvent(
      new KeyboardEvent("keyup", {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: shortcut,
      }),
    );
  }, key);
};

const openTimedEventFormWithShortcut = async (page: Page) => {
  const titleInput = getFormTitleInput(page);
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });
      await page.locator("#mainGrid").focus();
      await pressShortcut(page, "c");
      if (!(await titleInput.isVisible().catch(() => false))) {
        await page.keyboard.press("c");
      }

      await titleInput.waitFor({
        state: "visible",
        timeout: FORM_OPEN_ATTEMPT_TIMEOUT_MS,
      });
      return;
    } catch (error) {
      lastError = error;
      if (await titleInput.isVisible().catch(() => false)) {
        return;
      }
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(200);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to open timed event form.");
};

const fillTitleAndSaveEventForm = async (page: Page, title: string) => {
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const titleInput = getFormTitleInput(page);

    try {
      await titleInput.waitFor({
        state: "visible",
        timeout: FORM_OPEN_ATTEMPT_TIMEOUT_MS,
      });
      await titleInput.fill(title);
      break;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(100);

      if (attempt === 3) {
        throw lastError;
      }
    }
  }

  const saveButton = page
    .getByRole("form")
    .getByRole("button", { name: "Save" });
  await saveButton.evaluate((element) => {
    (element as HTMLElement).click();
  });

  await getFormTitleInput(page).waitFor({
    state: "hidden",
    timeout: FORM_TIMEOUT_MS,
  });
};

const expectTimedEventVisible = async (page: Page, title: string) => {
  await page
    .locator("#timedEvents")
    .getByText(title)
    .waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
};

type ElementBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const getLocatorBox = async (
  locator: ReturnType<Page["locator"]>,
  message: string,
): Promise<ElementBox> => {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error(message);
  }

  return box;
};

const waitForElementBoxChange = async (
  page: Page,
  selector: string,
  initialBox: ElementBox,
  dimensions: Array<keyof ElementBox>,
  minDelta = 10,
) => {
  await page.waitForFunction(
    ({ box, keys, selector: elementSelector, threshold }) => {
      const element = document.querySelector(elementSelector);
      if (!element) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      const current = {
        height: rect.height,
        width: rect.width,
        x: rect.x,
        y: rect.y,
      };

      return keys.some((key) => Math.abs(current[key] - box[key]) >= threshold);
    },
    { box: initialBox, keys: dimensions, selector, threshold: minDelta },
    { timeout: FORM_TIMEOUT_MS },
  );
};

const dragOnMainGrid = async (
  page: Page,
  drag: { endY: number; startX: number; startY: number },
  options: { afterMoveMs?: number; holdMs?: number; steps?: number } = {},
) => {
  const { afterMoveMs = 0, holdMs = 0, steps = 12 } = options;

  await page.mouse.move(drag.startX, drag.startY);
  await page.mouse.down();
  if (holdMs > 0) {
    await page.waitForTimeout(holdMs);
  }
  await page.mouse.move(drag.startX, drag.endY, { steps });
  if (afterMoveMs > 0) {
    await page.waitForTimeout(afterMoveMs);
  }
  await page.mouse.up();
};

const waitForEventDraft = async (page: Page, eventSelector: string) => {
  await page
    .waitForFunction(
      (selector) => document.querySelectorAll(selector).length >= 2,
      eventSelector,
      { timeout: FORM_OPEN_ATTEMPT_TIMEOUT_MS },
    )
    .catch(() => undefined);
  await waitForSettledFrames(page);
};

const openTimedEventFormFromGrid = async (
  page: Page,
  point: { x: number; y: number },
) => {
  const titleInput = getFormTitleInput(page);
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });
      await page.locator("#mainGrid").focus();
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      await page
        .waitForFunction(
          () => document.querySelector("#timedEvents [role='button']"),
          undefined,
          { timeout: FORM_TIMEOUT_MS },
        )
        .catch(() => undefined);
      await page.mouse.up();
      await titleInput.waitFor({
        state: "visible",
        timeout: FORM_OPEN_ATTEMPT_TIMEOUT_MS,
      });
      return;
    } catch (error) {
      lastError = error;
      if (await titleInput.isVisible().catch(() => false)) {
        return;
      }
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(200);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to open timed event form from grid.");
};

const measureEmptyWeekLoad = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  await prepareCalendarState(page, baseUrl, []);

  return measureAction(page, async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForWeekReady(page);
  });
};

const measureHeavyWeekLoad = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { allDayEvents, timedEvents } = createHeavyWeekEvents();
  await prepareCalendarState(page, baseUrl, [...timedEvents, ...allDayEvents]);

  return measureAction(page, async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForWeekReady(page, {
      allDay: allDayEvents.length,
      timed: timedEvents.length,
    });
  });
};

const measureInputBaseline = async (page: Page): Promise<ScenarioSample> => {
  await page.setContent(
    [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8" />',
      "<title>Week view perf input baseline</title>",
      "<style>",
      "html, body { margin: 0; width: 100%; height: 100%; }",
      "main { width: 100vw; height: 100vh; }",
      "</style>",
      "</head>",
      "<body>",
      "<main></main>",
      "</body>",
      "</html>",
    ].join(""),
  );

  return measureAction(page, async () => {
    await page.mouse.move(200, 200);
    await page.mouse.down();
    await page.mouse.move(290, 320, { steps: 16 });
    await page.mouse.up();
  });
};

const prepareSingleTimedEventForMotion = async (
  page: Page,
  baseUrl: string,
) => {
  const event = createSingleDragEvent();
  await prepareCalendarState(page, baseUrl, [event]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForWeekReady(page, { allDay: 0, timed: 1 });

  const eventSelector = `#mainGrid [data-event-id="${event._id}"]`;
  const eventButton = page.locator(eventSelector);
  await eventButton.waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
  await eventButton.scrollIntoViewIfNeeded();
  await eventButton.waitFor({ state: "visible", timeout: FORM_TIMEOUT_MS });
  await waitForSettledFrames(page);

  const box = await getLocatorBox(
    eventButton,
    "Expected seeded timed event to be visible.",
  );

  return { box, eventButton, eventSelector };
};

const prepareEdgeNavigationTimedEventForMotion = async (
  page: Page,
  baseUrl: string,
) => {
  const event = createTimedEvent(
    60_000,
    getPerfWeekStart(),
    6,
    10 * 60,
    60,
    "Perf edge navigation target",
  );
  await prepareCalendarState(page, baseUrl, [event]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForWeekReady(page, { allDay: 0, timed: 1 });

  const eventSelector = `#mainGrid [data-event-id="${event._id}"]`;
  const eventButton = page.locator(eventSelector);
  await eventButton.waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
  await eventButton.scrollIntoViewIfNeeded();
  await eventButton.waitFor({ state: "visible", timeout: FORM_TIMEOUT_MS });
  await waitForSettledFrames(page);

  const box = await getLocatorBox(
    eventButton,
    "Expected seeded edge-navigation event to be visible.",
  );

  return { box, eventButton, eventSelector };
};

const prepareSingleAllDayEventForMotion = async (
  page: Page,
  baseUrl: string,
) => {
  const event = createAllDayEvent(0, getPerfWeekStart(), 3);
  await prepareCalendarState(page, baseUrl, [event]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForWeekReady(page, { allDay: 1, timed: 0 });

  const eventSelector = `#allDayEvents [data-event-id="${event._id}"]`;
  const eventButton = page.locator(eventSelector);
  await eventButton.waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
  await eventButton.waitFor({ state: "visible", timeout: FORM_TIMEOUT_MS });
  await waitForSettledFrames(page);

  const box = await getLocatorBox(
    eventButton,
    "Expected seeded all-day event to be visible.",
  );

  return { box, eventButton, eventSelector };
};

const prepareSingleAllDayResizeEventForMotion = async (
  page: Page,
  baseUrl: string,
) => {
  const event = createAllDayEvent(1, getPerfWeekStart(), 3, 2);
  await prepareCalendarState(page, baseUrl, [event]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForWeekReady(page, { allDay: 1, timed: 0 });

  const eventSelector = `#allDayEvents [data-event-id="${event._id}"]`;
  const eventButton = page.locator(eventSelector);
  await eventButton.waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
  await eventButton.waitFor({ state: "visible", timeout: FORM_TIMEOUT_MS });
  await waitForSettledFrames(page);

  const box = await getLocatorBox(
    eventButton,
    "Expected seeded all-day resize event to be visible.",
  );

  return { box, eventButton, eventSelector };
};

const enableWeekInteractionV2 = async (page: Page) => {
  await page.evaluate(() => {
    (
      window as Window & { __weekInteractionV2ForceEnabled?: boolean }
    ).__weekInteractionV2ForceEnabled = true;
  });
};

const waitForWeekInteractionOverlay = async (page: Page) => {
  await page
    .locator("[data-week-interaction-overlay='true']")
    .waitFor({ state: "attached", timeout: FORM_OPEN_ATTEMPT_TIMEOUT_MS });
};

const measureCreateTimedEvent = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  await prepareCalendarState(page, baseUrl, []);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForWeekReady(page);
  await page.waitForTimeout(1_000);

  return measureAction(page, async () => {
    const title = `Perf created event ${Date.now()}`;
    await openTimedEventFormWithShortcut(page);
    await fillTitleAndSaveEventForm(page, title);
  });
};

const measureGridCreateTimedEvent = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  await prepareCalendarState(page, baseUrl, []);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForWeekReady(page);

  const mainGrid = page.locator("#mainGrid");
  const mainGridBox = await getLocatorBox(
    mainGrid,
    "Expected main grid to be visible.",
  );
  const x = mainGridBox.x + mainGridBox.width * 0.4;
  const y = mainGridBox.y + mainGridBox.height * 0.35;
  await page.waitForTimeout(1_000);

  return measureAction(page, async () => {
    const title = `Perf grid-created event ${Date.now()}`;
    await openTimedEventFormFromGrid(page, { x, y });
    await fillTitleAndSaveEventForm(page, title);
    await expectTimedEventVisible(page, title);
  });
};

const measureDragTimedEvent = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box, eventButton, eventSelector } =
    await prepareSingleTimedEventForMotion(page, baseUrl);

  const startX = box.x + box.width / 2;
  const startY = box.y + Math.min(20, box.height / 2);
  const endX = startX + 90;
  const endY = startY + 120;

  return measureAction(page, async () => {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 16 });
    await page.mouse.up();
    await eventButton.waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
    await waitForElementBoxChange(page, eventSelector, box, ["x", "y"]);
  });
};

const measureTimedDragV2ClickUnchanged = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box } = await prepareSingleTimedEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);
  const startX = box.x + box.width / 2;
  const startY = box.y + Math.min(20, box.height / 2);

  return measureAction(page, async () => {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.up();
    await getFormTitleInput(page).waitFor({
      state: "visible",
      timeout: FORM_TIMEOUT_MS,
    });
  });
};

const measureTimedDragV2StartFirstFrame = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box } = await prepareSingleTimedEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);
  const startX = box.x + box.width / 2;
  const startY = box.y + Math.min(20, box.height / 2);

  const sample = await measureAction(page, async () => {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 30, startY + 30, { steps: 4 });
    await waitForWeekInteractionOverlay(page);
  });

  await page.mouse.up();

  return sample;
};

const measureTimedDragV2Sustained = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box } = await prepareSingleTimedEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);

  const startX = box.x + box.width / 2;
  const startY = box.y + Math.min(20, box.height / 2);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 30, startY + 30, { steps: 4 });
  await waitForWeekInteractionOverlay(page);

  const sample = await measureAction(page, async () => {
    await page.mouse.move(startX + 90, startY + 120, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 30, startY + 60, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 120, startY + 150, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 60, startY + 90, { steps: 24 });
    await page.waitForTimeout(250);
  });

  await page.mouse.up();

  return sample;
};

const measureTimedDragV2PointerupCommit = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box, eventButton, eventSelector } =
    await prepareSingleTimedEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);

  const startX = box.x + box.width / 2;
  const startY = box.y + Math.min(20, box.height / 2);
  const endX = startX + 90;
  const endY = startY + 120;

  return measureAction(page, async () => {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 30, startY + 30, { steps: 4 });
    await waitForWeekInteractionOverlay(page);
    await page.mouse.move(endX, endY, { steps: 16 });
    await page.mouse.up();
    await eventButton.waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
    await waitForElementBoxChange(page, eventSelector, box, ["x", "y"]);
  });
};

const measureLongDragTimedEvent = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box, eventButton, eventSelector } =
    await prepareSingleTimedEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);

  const startX = box.x + box.width / 2;
  const startY = box.y + Math.min(20, box.height / 2);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 30, startY + 30, { steps: 4 });
  await waitForWeekInteractionOverlay(page);

  const sample = await measureAction(page, async () => {
    await page.mouse.move(startX + 90, startY + 120, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 30, startY + 60, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 120, startY + 150, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 60, startY + 90, { steps: 24 });
    await page.waitForTimeout(250);
  });

  await page.mouse.up();
  await eventButton.waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
  await waitForElementBoxChange(page, eventSelector, box, ["x", "y"]);

  return sample;
};

const measureResizeTimedEvent = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box, eventButton, eventSelector } =
    await prepareSingleTimedEventForMotion(page, baseUrl);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height - 2;
  const endY = startY + 90;

  return measureAction(page, async () => {
    await dragOnMainGrid(page, { endY, startX, startY });
    await eventButton.waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
    await waitForElementBoxChange(page, eventSelector, box, ["height"]);
  });
};

const measureResizeJitterTimedEvent = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box, eventButton, eventSelector } =
    await prepareSingleTimedEventForMotion(page, baseUrl);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height - 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await waitForEventDraft(page, eventSelector);

  const sample = await measureAction(page, async () => {
    await page.mouse.move(startX, startY + 90, { steps: 12 });
    await page.mouse.move(startX, startY + 30, { steps: 12 });
    await page.mouse.move(startX, startY + 120, { steps: 12 });
    await page.mouse.move(startX, startY + 45, { steps: 12 });
    await page.mouse.move(startX, startY + 100, { steps: 12 });
  });

  await page.mouse.up();
  await eventButton.waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
  await waitForElementBoxChange(page, eventSelector, box, ["height"]);

  return sample;
};

const measureTimedResizeV2SustainedBottom = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box } = await prepareSingleTimedEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height - 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 30, { steps: 4 });
  await waitForWeekInteractionOverlay(page);

  const sample = await measureAction(page, async () => {
    await page.mouse.move(startX, startY + 120, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX, startY + 60, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX, startY + 150, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX, startY + 90, { steps: 24 });
    await page.waitForTimeout(250);
  });

  await page.mouse.up();

  return sample;
};

const measureTimedResizeV2SustainedTop = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box } = await prepareSingleTimedEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);

  const startX = box.x + box.width / 2;
  const startY = box.y + 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY - 30, { steps: 4 });
  await waitForWeekInteractionOverlay(page);

  const sample = await measureAction(page, async () => {
    await page.mouse.move(startX, startY - 90, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX, startY - 30, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX, startY - 120, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX, startY - 60, { steps: 24 });
    await page.waitForTimeout(250);
  });

  await page.mouse.up();

  return sample;
};

const measureTimedResizeV2EdgeFlip = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box } = await prepareSingleTimedEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);

  const startX = box.x + box.width / 2;
  const startY = box.y + 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 30, { steps: 4 });
  await waitForWeekInteractionOverlay(page);

  const sample = await measureAction(page, async () => {
    await page.mouse.move(startX, startY + box.height + 90, { steps: 32 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX, startY + 20, { steps: 32 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX, startY + box.height + 120, { steps: 32 });
    await page.waitForTimeout(250);
  });

  await page.mouse.up();

  return sample;
};

const measureAllDayDragV2Sustained = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box } = await prepareSingleAllDayEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 30, startY, { steps: 4 });
  await waitForWeekInteractionOverlay(page);

  const sample = await measureAction(page, async () => {
    await page.mouse.move(startX + 120, startY, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 60, startY, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 180, startY, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 90, startY, { steps: 24 });
    await page.waitForTimeout(250);
  });

  await page.mouse.up();

  return sample;
};

const measureAllDayResizeV2Sustained = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box } = await prepareSingleAllDayResizeEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);

  const startX = box.x + box.width - 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 30, startY, { steps: 4 });
  await waitForWeekInteractionOverlay(page);

  const sample = await measureAction(page, async () => {
    await page.mouse.move(startX + 120, startY, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 60, startY, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 180, startY, { steps: 24 });
    await page.waitForTimeout(250);
    await page.mouse.move(startX + 90, startY, { steps: 24 });
    await page.waitForTimeout(250);
  });

  await page.mouse.up();

  return sample;
};

const measureSmartScrollDragV2 = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box } = await prepareSingleTimedEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);

  const mainGrid = page.locator("#mainGrid");
  const gridBox = await getLocatorBox(
    mainGrid,
    "Expected main grid to be visible for smart scroll.",
  );
  const startX = box.x + box.width / 2;
  const startY = box.y + Math.min(20, box.height / 2);
  const bottomZoneY = gridBox.y + gridBox.height - 60;
  const initialScrollTop = await mainGrid.evaluate(
    (element) => element.scrollTop,
  );

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 30, startY + 30, { steps: 4 });
  await waitForWeekInteractionOverlay(page);

  const sample = await measureAction(page, async () => {
    await page.mouse.move(startX + 30, bottomZoneY, { steps: 24 });
    await page.waitForTimeout(350);
    await page.mouse.move(startX + 45, bottomZoneY, { steps: 24 });
    await page.waitForTimeout(350);
    await page.mouse.move(startX + 60, bottomZoneY, { steps: 24 });
    await page.waitForTimeout(350);
  });

  const finalScrollTop = await mainGrid.evaluate(
    (element) => element.scrollTop,
  );
  await page.mouse.up();

  if (finalScrollTop <= initialScrollTop) {
    throw new Error(
      `Expected V2 smart scroll to move the main grid. Before: ${initialScrollTop}; after: ${finalScrollTop}.`,
    );
  }

  return sample;
};

const getViewStartDate = (page: Page) =>
  page.evaluate(() => {
    const compassWindow = window as Window & {
      __COMPASS_E2E_STORE__?: {
        getState: () => { view: { dates: { start: string } } };
      };
    };

    return compassWindow.__COMPASS_E2E_STORE__?.getState().view.dates.start;
  });

const measureEdgeNavigationDragV2 = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const { box } = await prepareEdgeNavigationTimedEventForMotion(page, baseUrl);
  await enableWeekInteractionV2(page);

  const mainGrid = page.locator("#mainGrid");
  const gridBox = await getLocatorBox(
    mainGrid,
    "Expected main grid to be visible for edge navigation.",
  );
  const startX = box.x + box.width / 2;
  const startY = box.y + Math.min(20, box.height / 2);
  const rightEdgeX = gridBox.x + gridBox.width - 20;
  const initialViewStart = await getViewStartDate(page);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(rightEdgeX, startY, { steps: 8 });
  await waitForWeekInteractionOverlay(page);

  const sample = await measureAction(page, async () => {
    await page.waitForFunction(
      (startDate) => {
        const compassWindow = window as Window & {
          __COMPASS_E2E_STORE__?: {
            getState: () => { view: { dates: { start: string } } };
          };
        };

        return (
          compassWindow.__COMPASS_E2E_STORE__?.getState().view.dates.start !==
          startDate
        );
      },
      initialViewStart,
      { timeout: FORM_TIMEOUT_MS },
    );
    await page.mouse.move(rightEdgeX - 10, startY, { steps: 4 });
    await page.waitForTimeout(150);
  });

  await page.mouse.up();

  return sample;
};

const SCENARIOS: ScenarioDefinition[] = [
  {
    isolateSamples: true,
    name: "input-baseline",
    run: measureInputBaseline,
  },
  { name: "empty-week-load", run: measureEmptyWeekLoad },
  { name: "heavy-week-load", run: measureHeavyWeekLoad },
  {
    isolateSamples: true,
    name: "create-timed-event",
    run: measureCreateTimedEvent,
  },
  {
    isolateSamples: true,
    name: "grid-create-timed-event",
    run: measureGridCreateTimedEvent,
  },
  {
    isolateSamples: true,
    name: "drag-timed-event",
    run: measureDragTimedEvent,
  },
  {
    isolateSamples: true,
    name: "timed-drag-v2-click-unchanged",
    run: measureTimedDragV2ClickUnchanged,
  },
  {
    isolateSamples: true,
    name: "timed-drag-v2-start-first-frame",
    run: measureTimedDragV2StartFirstFrame,
  },
  {
    isolateSamples: true,
    name: "timed-drag-v2-sustained",
    run: measureTimedDragV2Sustained,
  },
  {
    isolateSamples: true,
    name: "timed-drag-v2-pointerup-commit",
    run: measureTimedDragV2PointerupCommit,
  },
  {
    isolateSamples: true,
    name: "long-drag-timed-event",
    run: measureLongDragTimedEvent,
  },
  {
    isolateSamples: true,
    name: "resize-timed-event",
    run: measureResizeTimedEvent,
  },
  {
    isolateSamples: true,
    name: "resize-jitter-timed-event",
    run: measureResizeJitterTimedEvent,
  },
  {
    isolateSamples: true,
    name: "timed-resize-v2-sustained-bottom",
    run: measureTimedResizeV2SustainedBottom,
  },
  {
    isolateSamples: true,
    name: "timed-resize-v2-sustained-top",
    run: measureTimedResizeV2SustainedTop,
  },
  {
    isolateSamples: true,
    name: "timed-resize-v2-edge-flip",
    run: measureTimedResizeV2EdgeFlip,
  },
  {
    isolateSamples: true,
    name: "all-day-drag-v2-sustained",
    run: measureAllDayDragV2Sustained,
  },
  {
    isolateSamples: true,
    name: "all-day-resize-v2-sustained",
    run: measureAllDayResizeV2Sustained,
  },
  {
    isolateSamples: true,
    name: "smart-scroll-drag-v2",
    run: measureSmartScrollDragV2,
  },
  {
    isolateSamples: true,
    name: "edge-navigation-drag-v2",
    run: measureEdgeNavigationDragV2,
  },
];

const selectScenarios = (options: CliOptions) => {
  if (options.scenarios.size === 0) {
    return SCENARIOS;
  }

  const selected = SCENARIOS.filter((scenario) =>
    options.scenarios.has(scenario.name),
  );

  if (selected.length !== options.scenarios.size) {
    const known = new Set(SCENARIOS.map((scenario) => scenario.name));
    const unknown = [...options.scenarios].filter((name) => !known.has(name));
    throw new Error(`Unknown scenario(s): ${unknown.join(", ")}`);
  }

  return selected;
};

const runScenarios = async (
  browser: Browser,
  baseUrl: string,
  options: CliOptions,
  scenarios: ScenarioDefinition[],
) => {
  const results: ScenarioResult[] = [];

  const runScenarioOnce = async (
    scenario: ScenarioDefinition,
    context?: BrowserContext,
  ) => {
    const sampleContext = context ?? (await newScenarioContext(browser));
    const scenarioPage = await newScenarioPage(sampleContext);

    try {
      return await scenario.run(scenarioPage.page, baseUrl);
    } finally {
      await scenarioPage.page.close();
      if (!context) {
        await sampleContext.close();
      }
    }
  };

  for (const scenario of scenarios) {
    const samples: ScenarioSample[] = [];
    const context = scenario.isolateSamples
      ? undefined
      : await newScenarioContext(browser);
    writeOut(`Running ${scenario.name} (${options.runs} sample(s))...`);

    try {
      for (let index = 0; index < options.warmups; index += 1) {
        await runScenarioOnce(scenario, context);
        writeOut(`  warmup ${index + 1}/${options.warmups}: discarded`);
      }

      for (let index = 0; index < options.runs; index += 1) {
        const sample = await runScenarioOnce(scenario, context);
        samples.push(sample);
        writeOut(
          `  ${index + 1}/${options.runs}: ${sample.durationMs.toFixed(1)} ms${formatSampleWeekInteractionMetrics(sample)}`,
        );
      }
    } finally {
      await context?.close();
    }

    results.push(summarizeScenario(scenario.name, samples));
  }

  return results;
};

const formatSampleWeekInteractionMetrics = (sample: ScenarioSample) => {
  const metrics = sample.weekInteraction;

  if (!metrics?.available) {
    return " (V2 counters unavailable)";
  }

  return [
    "",
    `React ${metrics.reactCommitsDuringMotion}`,
    `Redux ${metrics.reduxDispatchesDuringMotion}`,
    `DOM ${metrics.unexpectedDomMutationsDuringMotion}`,
    `layout ${metrics.layoutReadsDuringMotion}`,
    `save ${metrics.saveRequestsDuringMotion}/${metrics.saveRequestsAfterPointerUp}`,
    `RAF ${metrics.rafDurationP95Ms.toFixed(1)}/${metrics.rafDurationMaxMs.toFixed(1)} ms`,
  ].join("; ");
};

const readBaseline = async (
  compare: string | undefined,
  outputDir: string,
): Promise<PerfRunResult | null> => {
  if (!compare) {
    return null;
  }

  const baselinePath = path.resolve(resolveComparePath(compare, outputDir));
  const rawBaseline = await readFile(baselinePath, "utf8");

  return JSON.parse(rawBaseline) as PerfRunResult;
};

const appendHistory = async (result: PerfRunResult, outputDir: string) => {
  const historyPath = path.join(outputDir, "history.jsonl");
  const compact = {
    branch: result.git.branch,
    browserVersion: result.runContext.browserVersion,
    commit: result.git.commit,
    comparison: result.comparison
      ? {
          baseline: result.comparison.baseline,
          scenarios: result.comparison.scenarios.map((scenario) => ({
            longTaskDelta: scenario.longTaskCount.delta,
            maxFrameGapDeltaMs: Number(scenario.maxFrameGapMs.delta.toFixed(1)),
            medianDeltaMs: Number(scenario.medianMs.delta.toFixed(1)),
            name: scenario.name,
            p95DeltaMs: Number(scenario.p95Ms.delta.toFixed(1)),
          })),
        }
      : undefined,
    dirty: result.git.dirty,
    headless: result.runContext.headless,
    label: result.label,
    note: result.note,
    outputPath: result.outputPath,
    runAt: result.runAt,
    scenariosRun: result.runContext.scenarios,
    scenarios: result.scenarios.map((scenario) => ({
      longTaskCount: scenario.longTaskCount,
      maxFrameGapMs: Number(scenario.maxFrameGapMs.toFixed(1)),
      medianMs: Number(scenario.medianMs.toFixed(1)),
      name: scenario.name,
      p95Ms: Number(scenario.p95Ms.toFixed(1)),
      weekInteraction: scenario.weekInteraction,
    })),
    viewport: result.runContext.viewport,
    warmupRuns: result.runContext.warmupRuns,
    weekStart: result.runContext.weekStart,
  };

  await writeFile(historyPath, `${JSON.stringify(compact)}\n`, {
    flag: "a",
  });
};

const saveResult = async (
  result: Omit<PerfRunResult, "outputPath">,
  outputDir: string,
) => {
  await mkdir(outputDir, { recursive: true });

  const timestamp = result.runAt.replace(/[:.]/g, "-");
  const filename = `${timestamp}-${toSafeLabel(result.label)}.json`;
  const outputPath = path.join(outputDir, filename);
  const finalResult: PerfRunResult = { ...result, outputPath };
  const serialized = `${JSON.stringify(finalResult, null, 2)}\n`;

  await writeFile(outputPath, serialized);
  await writeFile(getLatestPath(outputDir), serialized);
  await appendHistory(finalResult, outputDir);

  return finalResult;
};

const formatMs = (value: number) => `${value.toFixed(1)} ms`;

const formatDeltaMs = (value: number) => {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)} ms`;
};

const formatDeltaCount = (value: number) => {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value}`;
};

const formatDeltaPercent = (value: number) => {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
};

const printResultTable = (result: PerfRunResult) => {
  writeOut("");
  writeOut(`Week view performance: ${result.label}`);
  if (result.note) {
    writeOut(`Note: ${result.note}`);
  }
  writeOut(`Commit: ${result.git.commit}${result.git.dirty ? " (dirty)" : ""}`);
  writeOut(
    `Browser: chromium ${result.runContext.browserVersion} ${result.runContext.headless ? "(headless)" : "(headed)"}`,
  );
  writeOut(
    `Viewport: ${result.runContext.viewport.width}x${result.runContext.viewport.height}; warmups: ${result.runContext.warmupRuns}; seed week: ${result.runContext.weekStart}`,
  );
  writeOut("");
  writeOut(
    "Scenario                 Median      P95         Max frame gap  Long tasks",
  );

  for (const scenario of result.scenarios) {
    writeOut(
      `${scenario.name.padEnd(24)}${formatMs(scenario.medianMs).padEnd(12)}${formatMs(
        scenario.p95Ms,
      ).padEnd(12)}${formatMs(scenario.maxFrameGapMs).padEnd(15)}${String(
        scenario.longTaskCount,
      )}`,
    );
  }

  printWeekInteractionTable(result);
  writeOut("");
  writeOut(`Saved: ${result.outputPath}`);
};

const formatNullableMs = (value: number | null) =>
  value === null ? "n/a" : formatMs(value);

const printWeekInteractionTable = (result: PerfRunResult) => {
  const scenariosWithMetrics = result.scenarios.filter(
    (scenario) => scenario.weekInteraction?.available,
  );

  writeOut("");

  if (scenariosWithMetrics.length === 0) {
    writeOut("Week interaction V2 counters: unavailable for this run.");
    return;
  }

  writeOut(
    "Week interaction V2 counters: scenario, React, Redux, unexpected DOM, layout reads, save during/after, RAF p95/max, first frame",
  );

  for (const scenario of scenariosWithMetrics) {
    const metrics = scenario.weekInteraction;

    if (!metrics) {
      continue;
    }

    writeOut(
      [
        scenario.name,
        `React ${metrics.reactCommitsDuringMotion}`,
        `Redux ${metrics.reduxDispatchesDuringMotion}`,
        `DOM ${metrics.unexpectedDomMutationsDuringMotion}`,
        `layout ${metrics.layoutReadsDuringMotion}`,
        `save ${metrics.saveRequestsDuringMotion}/${metrics.saveRequestsAfterPointerUp}`,
        `RAF ${formatMs(metrics.rafDurationP95Ms)}/${formatMs(metrics.rafDurationMaxMs)}`,
        `first ${formatNullableMs(metrics.firstFrameLatencyMs)}`,
      ].join(" | "),
    );
  }
};

const printComparison = (
  baseline: PerfRunResult | null,
  current: PerfRunResult,
) => {
  if (!baseline || !current.comparison) {
    return;
  }

  writeOut("");
  writeOut(`Compared with: ${baseline.label} (${baseline.git.commit})`);
  writeOut(
    "Scenario                 Before      After       Median      Frame gap   Long tasks",
  );

  for (const scenario of current.comparison.scenarios) {
    const medianChange = `${formatDeltaMs(scenario.medianMs.delta)} (${formatDeltaPercent(
      scenario.medianMs.deltaPercent,
    )})`;

    writeOut(
      `${scenario.name.padEnd(24)}${formatMs(scenario.medianMs.before).padEnd(
        12,
      )}${formatMs(scenario.medianMs.after).padEnd(12)}${medianChange.padEnd(
        20,
      )}${formatDeltaMs(scenario.maxFrameGapMs.delta).padEnd(
        12,
      )}${formatDeltaCount(scenario.longTaskCount.delta)}`,
    );
  }
};

const main = async () => {
  const options = parseOptions();
  const scenariosToRun = selectScenarios(options);
  const git = getGitInfo();
  const baseline = await readBaseline(options.compare, options.outputDir);
  validateLatestComparison({
    baseline,
    compare: options.compare,
    current: {
      git,
      runsPerScenario: options.runs,
      runContext: {
        headless: !options.headed,
        scenarios: scenariosToRun.map((scenario) => scenario.name),
        viewport: VIEWPORT,
        weekStart: RUN_WEEK_START_LABEL,
      },
    },
    expectedScenarios: scenariosToRun.map((scenario) => scenario.name),
  });
  const server = await startServer(options);
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: !options.headed });
    const scenarios = await runScenarios(
      browser,
      server.baseUrl,
      options,
      scenariosToRun,
    );
    const runContext = createRunContext(browser, options, scenariosToRun);
    const resultWithoutOutputPath = {
      baseUrl: server.baseUrl,
      git,
      label: options.label,
      note: options.note,
      runAt: new Date().toISOString(),
      runContext,
      runsPerScenario: options.runs,
      scenarios,
    };
    const result = await saveResult(
      {
        ...resultWithoutOutputPath,
        comparison: buildComparison(baseline, {
          ...resultWithoutOutputPath,
          outputPath: "",
        }),
      },
      options.outputDir,
    );

    printResultTable(result);
    printComparison(baseline, result);
  } finally {
    await browser?.close();
    await server.stop();
  }
};

await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  writeErr(message);
  process.exit(1);
});
