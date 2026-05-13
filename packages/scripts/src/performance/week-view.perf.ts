import { type Browser, chromium, type Page } from "playwright";
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

type BrowserMetricSummary = {
  longTaskCount: number;
  maxFrameGapMs: number;
  maxLongTaskMs: number;
};

type ScenarioSample = BrowserMetricSummary & {
  durationMs: number;
};

type ScenarioResult = BrowserMetricSummary & {
  averageMs: number;
  maxMs: number;
  medianMs: number;
  minMs: number;
  name: string;
  p95Ms: number;
  samples: ScenarioSample[];
};

type PerfRunResult = {
  baseUrl: string;
  git: {
    branch: string;
    commit: string;
    dirty: boolean;
  };
  label: string;
  note?: string;
  outputPath: string;
  runAt: string;
  runsPerScenario: number;
  scenarios: ScenarioResult[];
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
};

type ScenarioDefinition = {
  name: string;
  run: (page: Page, baseUrl: string) => Promise<ScenarioSample>;
};

type ServerHandle = {
  baseUrl: string;
  stop: () => Promise<void>;
};

const REPO_ROOT = path.resolve(import.meta.dir, "../../../..");
const WEB_ROOT = path.join(REPO_ROOT, "packages/web");
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, "tmp/perf/week-view");
const LOCAL_DB_NAME = "compass-local";
const DEFAULT_RUNS = 5;
const DEFAULT_PORT = 9160;
const FORM_TIMEOUT_MS = 10_000;
const SERVER_TIMEOUT_MS = 120_000;

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
  };
};

const getGitValue = (args: string[]) =>
  execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();

const getGitInfo = () => {
  const branch = getGitValue(["branch", "--show-current"]) || "detached";
  const commit = getGitValue(["rev-parse", "--short", "HEAD"]);
  const dirty =
    getGitValue(["status", "--short", "--untracked-files=no"]).length > 0;

  return { branch, commit, dirty };
};

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

    return {
      longTaskCount: longTasks.length,
      maxFrameGapMs: Math.max(0, ...frameGaps),
      maxLongTaskMs: Math.max(0, ...longTasks),
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

const getCurrentWeekStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());

  return date;
};

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
): StoredPerfEvent => {
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + dayOffset);

  return {
    _id: objectIdFromNumber(10_000 + index),
    allDayOrder: index,
    endDate: toDateOnly(date),
    isAllDay: true,
    isSomeday: false,
    order: index,
    origin: "compass",
    priority: "relationships",
    startDate: toDateOnly(date),
    title: `Perf all-day event ${index}`,
    updatedAt: new Date().toISOString(),
    user: "perf-user",
  };
};

const createHeavyWeekEvents = () => {
  const weekStart = getCurrentWeekStart();
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
  const weekStart = getCurrentWeekStart();
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

      await titleInput.waitFor({ state: "visible", timeout: 4_000 });
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
  const titleInput = getFormTitleInput(page);
  await titleInput.waitFor({ state: "visible", timeout: FORM_TIMEOUT_MS });
  await titleInput.fill(title);

  const saveButton = page
    .getByRole("form")
    .getByRole("button", { name: "Save" });
  await saveButton.evaluate((element) => {
    (element as HTMLElement).click();
  });

  await titleInput.waitFor({ state: "hidden", timeout: FORM_TIMEOUT_MS });
};

const expectTimedEventVisible = async (page: Page, title: string) => {
  await page
    .locator("#mainGrid")
    .getByRole("button", { name: title })
    .waitFor({ state: "visible", timeout: FORM_TIMEOUT_MS });
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

const measureCreateTimedEvent = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  await prepareCalendarState(page, baseUrl, []);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForWeekReady(page);

  return measureAction(page, async () => {
    const title = `Perf created event ${Date.now()}`;
    await openTimedEventFormWithShortcut(page);
    await fillTitleAndSaveEventForm(page, title);
    await expectTimedEventVisible(page, title);
  });
};

const measureDragTimedEvent = async (
  page: Page,
  baseUrl: string,
): Promise<ScenarioSample> => {
  const event = createSingleDragEvent();
  await prepareCalendarState(page, baseUrl, [event]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForWeekReady(page, { allDay: 0, timed: 1 });

  const eventButton = page.locator(`#mainGrid [data-event-id="${event._id}"]`);
  await eventButton.waitFor({ state: "attached", timeout: FORM_TIMEOUT_MS });
  await eventButton.scrollIntoViewIfNeeded();
  await eventButton.waitFor({ state: "visible", timeout: FORM_TIMEOUT_MS });

  const box = await eventButton.boundingBox();
  if (!box) {
    throw new Error("Expected seeded timed event to be visible.");
  }

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
  });
};

const SCENARIOS: ScenarioDefinition[] = [
  { name: "empty-week-load", run: measureEmptyWeekLoad },
  { name: "heavy-week-load", run: measureHeavyWeekLoad },
  { name: "create-timed-event", run: measureCreateTimedEvent },
  { name: "drag-timed-event", run: measureDragTimedEvent },
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
) => {
  const results: ScenarioResult[] = [];
  const scenarios = selectScenarios(options);

  for (const scenario of scenarios) {
    const samples: ScenarioSample[] = [];
    writeOut(`Running ${scenario.name} (${options.runs} sample(s))...`);

    for (let index = 0; index < options.runs; index += 1) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });

      try {
        const sample = await scenario.run(page, baseUrl);
        samples.push(sample);
        writeOut(
          `  ${index + 1}/${options.runs}: ${sample.durationMs.toFixed(1)} ms`,
        );
      } finally {
        await page.close();
      }
    }

    results.push(summarizeScenario(scenario.name, samples));
  }

  return results;
};

const getLatestPath = (outputDir: string) =>
  path.join(outputDir, "latest.json");

const resolveComparePath = (compare: string, outputDir: string) => {
  if (compare === "latest") {
    return getLatestPath(outputDir);
  }

  return path.resolve(compare);
};

const readBaseline = async (
  compare: string | undefined,
  outputDir: string,
): Promise<PerfRunResult | null> => {
  if (!compare) {
    return null;
  }

  const baselinePath = resolveComparePath(compare, outputDir);
  const rawBaseline = await readFile(baselinePath, "utf8");

  return JSON.parse(rawBaseline) as PerfRunResult;
};

const appendHistory = async (result: PerfRunResult, outputDir: string) => {
  const historyPath = path.join(outputDir, "history.jsonl");
  const compact = {
    branch: result.git.branch,
    commit: result.git.commit,
    dirty: result.git.dirty,
    label: result.label,
    note: result.note,
    outputPath: result.outputPath,
    runAt: result.runAt,
    scenarios: result.scenarios.map((scenario) => ({
      longTaskCount: scenario.longTaskCount,
      maxFrameGapMs: Number(scenario.maxFrameGapMs.toFixed(1)),
      medianMs: Number(scenario.medianMs.toFixed(1)),
      name: scenario.name,
      p95Ms: Number(scenario.p95Ms.toFixed(1)),
    })),
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

const printResultTable = (result: PerfRunResult) => {
  writeOut("");
  writeOut(`Week view performance: ${result.label}`);
  if (result.note) {
    writeOut(`Note: ${result.note}`);
  }
  writeOut(`Commit: ${result.git.commit}${result.git.dirty ? " (dirty)" : ""}`);
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

  writeOut("");
  writeOut(`Saved: ${result.outputPath}`);
};

const printComparison = (
  baseline: PerfRunResult | null,
  current: PerfRunResult,
) => {
  if (!baseline) {
    return;
  }

  const baselineByName = new Map(
    baseline.scenarios.map((scenario) => [scenario.name, scenario]),
  );

  writeOut("");
  writeOut(`Compared with: ${baseline.label} (${baseline.git.commit})`);
  writeOut("Scenario                 Before      After       Change");

  for (const currentScenario of current.scenarios) {
    const baselineScenario = baselineByName.get(currentScenario.name);
    if (!baselineScenario) {
      continue;
    }

    const deltaMs = currentScenario.medianMs - baselineScenario.medianMs;
    const deltaPercent =
      baselineScenario.medianMs === 0
        ? 0
        : (deltaMs / baselineScenario.medianMs) * 100;
    const sign = deltaMs > 0 ? "+" : "";

    writeOut(
      `${currentScenario.name.padEnd(24)}${formatMs(
        baselineScenario.medianMs,
      ).padEnd(
        12,
      )}${formatMs(currentScenario.medianMs).padEnd(12)}${sign}${deltaMs.toFixed(
        1,
      )} ms (${sign}${deltaPercent.toFixed(1)}%)`,
    );
  }
};

const main = async () => {
  const options = parseOptions();
  const baseline = await readBaseline(options.compare, options.outputDir);
  const server = await startServer(options);
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: !options.headed });
    const scenarios = await runScenarios(browser, server.baseUrl, options);
    const result = await saveResult(
      {
        baseUrl: server.baseUrl,
        git: getGitInfo(),
        label: options.label,
        note: options.note,
        runAt: new Date().toISOString(),
        runsPerScenario: options.runs,
        scenarios,
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
