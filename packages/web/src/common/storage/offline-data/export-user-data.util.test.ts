import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { createMockLocalEventRecord } from "@web/__tests__/utils/factories/event.factory";
import {
  createClearExportedTasks,
  createCollectExportData,
  getExportFilename,
  notifyExport,
} from "./export-user-data.util";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const ensureOfflineDataStoreReady = mock();
const getAllTasks = mock();
const getAllEvents = mock();
const clearAllTasks = mock();

const collectExportData = createCollectExportData({
  ensureOfflineDataStoreReady,
  getOfflineDataStore: () => ({ getAllTasks, getAllEvents, clearAllTasks }),
});

const clearExportedTasks = createClearExportedTasks({
  getOfflineDataStore: () => ({ getAllTasks, getAllEvents, clearAllTasks }),
});

describe("collectExportData", () => {
  beforeEach(() => {
    ensureOfflineDataStoreReady.mockClear();
    getAllTasks.mockClear();
    getAllEvents.mockClear();
    clearAllTasks.mockClear();
    getAllTasks.mockResolvedValue([]);
    getAllEvents.mockResolvedValue([]);
  });

  it("includes retained tasks and non-demo events, excluding demo events", async () => {
    const task = { _id: "task-1", title: "Recover me" };
    const userRecord = createMockLocalEventRecord({}, false);
    const demoRecord = createMockLocalEventRecord({}, true);
    getAllTasks.mockResolvedValue([task]);
    getAllEvents.mockResolvedValue([userRecord, demoRecord]);

    const result = await collectExportData();

    expect(ensureOfflineDataStoreReady).toHaveBeenCalledTimes(1);
    expect(result.version).toBe(1);
    expect(result.tasks).toEqual([task]);
    expect(result.events).toEqual([userRecord]);
    expect(typeof result.exportedAt).toBe("string");
  });

  it("omits _migrations entirely (only tasks/events are read)", async () => {
    await collectExportData();

    expect(getAllTasks).toHaveBeenCalledTimes(1);
    expect(getAllEvents).toHaveBeenCalledTimes(1);
  });
});

describe("getExportFilename", () => {
  it("formats the date key using the local calendar day, not UTC", () => {
    // A near-midnight instant is the case where UTC and local calendar days
    // diverge for any timezone offset from UTC — asserting against dayjs's
    // own local formatting (the project's date-formatting convention, see
    // web.date.util.ts) rather than toISOString() catches a regression back
    // to UTC-based formatting regardless of the test runner's own TZ.
    const nearMidnight = new Date("2026-07-15T23:30:00.000");
    const expectedLocalDateKey = dayjs(nearMidnight).format(
      YEAR_MONTH_DAY_FORMAT,
    );

    expect(getExportFilename(nearMidnight)).toBe(
      `compass-export-${expectedLocalDateKey}.json`,
    );
  });
});

describe("clearExportedTasks", () => {
  it("clears the tasks table", async () => {
    await clearExportedTasks();

    expect(clearAllTasks).toHaveBeenCalledTimes(1);
  });
});

describe("notifyExport", () => {
  // Assigned in beforeEach/restored in afterEach (not module scope) so this
  // reliably wins against MSW's global fetch patching — matches
  // useVersionCheck.test.ts's pattern for mocking a raw external fetch call.
  const mockFetch = mock();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("posts the user's email to the webhook", async () => {
    notifyExport("user@example.com");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, requestInit] = mockFetch.mock.calls[0];
    expect(url).toContain("discord.com/api/webhooks");
    expect(requestInit.method).toBe("POST");
    expect(JSON.parse(requestInit.body as string).content).toContain(
      "user@example.com",
    );

    // Let notifyExport's internal .catch() chain settle before the test ends
    // so its resolution doesn't bleed into the next test.
    await Promise.resolve();
    await Promise.resolve();
  });

  // A rejected-fetch case isn't covered here directly (mocking a raw fetch
  // reliably across bun test files fighting MSW's global patching proved too
  // flaky to justify) — notifyExport's implementation is a trivial
  // `fetch(...).catch(() => {})`, and useExportDataCmdItems.test.ts's "still
  // exports and clears tasks even when the webhook notification throws"
  // covers the behavior that actually matters: a failing notification must
  // never break the export.
});
