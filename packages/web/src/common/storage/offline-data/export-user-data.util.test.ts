import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { createMockLocalEventRecord } from "@web/__tests__/utils/factories/event.factory";
import {
  createClearExportedTasks,
  createCollectExportData,
  createRunExportMyData,
  getExportFilename,
} from "./export-user-data.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

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

  it("includes a message inviting pre-cutoff signups to email for their someday events", async () => {
    const result = await collectExportData();

    expect(result.message).toContain("tyler@switchback.tech");
    expect(result.message).toContain("July 15, 2026");
    expect(result.message.toLowerCase()).toContain("someday");
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

describe("runExportMyData", () => {
  const mockCollectExportData = mock();
  const mockDownloadAsJsonFile = mock();
  const mockClearExportedTasks = mock();
  const mockGetExportFilename = mock();

  const runExportMyData = createRunExportMyData({
    collectExportData: mockCollectExportData,
    downloadAsJsonFile: mockDownloadAsJsonFile,
    clearExportedTasks: mockClearExportedTasks,
    getExportFilename: mockGetExportFilename,
  });

  beforeEach(() => {
    mockCollectExportData.mockClear();
    mockDownloadAsJsonFile.mockClear();
    mockClearExportedTasks.mockClear();
    mockGetExportFilename.mockClear();

    mockCollectExportData.mockResolvedValue({
      exportedAt: "2026-07-15T00:00:00.000Z",
      version: 1,
      tasks: [],
      events: [],
    });
    mockClearExportedTasks.mockResolvedValue(undefined);
    mockGetExportFilename.mockReturnValue("compass-export-2026-07-15.json");
  });

  it("downloads the export, then clears tasks", async () => {
    await runExportMyData();

    expect(mockDownloadAsJsonFile).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1 }),
      "compass-export-2026-07-15.json",
    );
    expect(mockClearExportedTasks).toHaveBeenCalledTimes(1);
  });

  it("rejects and skips download/clear when collecting export data fails", async () => {
    mockCollectExportData.mockRejectedValue(new Error("dexie is closed"));

    await expect(runExportMyData()).rejects.toThrow("dexie is closed");

    expect(mockDownloadAsJsonFile).not.toHaveBeenCalled();
    expect(mockClearExportedTasks).not.toHaveBeenCalled();
  });

  it("resolves even when clearing the tasks table fails after a successful download", async () => {
    mockClearExportedTasks.mockRejectedValue(new Error("write conflict"));

    await expect(runExportMyData()).resolves.toBeUndefined();

    expect(mockDownloadAsJsonFile).toHaveBeenCalledTimes(1);
  });
});
