import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type OfflineDataStore } from "@web/common/storage/offline-data/offline-data.store";
import {
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
} from "@web/common/storage/offline-data/offline-data.store.registry";

const SOMEDAY_EVENTS_NOTICE =
  "Someday events aren't included in this file. If you signed up before July 15, 2026 and want your Someday events, email tyler@switchback.tech. If you signed up after that date, you never had Someday events, so no action is needed.";

interface CompassDataExport {
  exportedAt: string;
  version: 1;
  message: string;
  tasks: unknown[];
  events: unknown[];
}

type ExportDataStorage = Pick<
  OfflineDataStore,
  "getAllTasks" | "getAllEvents" | "clearAllTasks"
>;

type ExportDataDependencies = {
  ensureOfflineDataStoreReady: typeof ensureOfflineDataStoreReady;
  getOfflineDataStore: () => ExportDataStorage;
};

export function createCollectExportData({
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
}: ExportDataDependencies) {
  /**
   * Read the user's local IndexedDB data into a single exportable snapshot.
   * Excludes `_migrations` (infrastructure) and demo events (seeded, not
   * user-created) — only real user data is included.
   */
  return async function collectExportData(): Promise<CompassDataExport> {
    await ensureOfflineDataStoreReady();
    const store = getOfflineDataStore();

    const [tasks, events] = await Promise.all([
      store.getAllTasks(),
      store.getAllEvents(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      message: SOMEDAY_EVENTS_NOTICE,
      tasks,
      events: events.filter((record) => !record.isDemo),
    };
  };
}

export function createClearExportedTasks({
  getOfflineDataStore,
}: Pick<ExportDataDependencies, "getOfflineDataStore">) {
  /**
   * Clear the retained legacy tasks table now that it's been exported.
   * Events are left untouched — for local-mode users, the events table is
   * their live calendar, not stale data.
   */
  return async function clearExportedTasks(): Promise<void> {
    const store = getOfflineDataStore();
    await store.clearAllTasks();
  };
}

/** Trigger a browser download of `data` as a formatted JSON file. */
export function downloadAsJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function getExportFilename(date = new Date()): string {
  const dateKey = dayjs(date).format(YEAR_MONTH_DAY_FORMAT);
  return `compass-export-${dateKey}.json`;
}

export const collectExportData = createCollectExportData({
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
});

export const clearExportedTasks = createClearExportedTasks({
  getOfflineDataStore,
});

type RunExportMyDataDependencies = {
  collectExportData: typeof collectExportData;
  downloadAsJsonFile: typeof downloadAsJsonFile;
  clearExportedTasks: typeof clearExportedTasks;
  getExportFilename: typeof getExportFilename;
};

export function createRunExportMyData({
  collectExportData,
  downloadAsJsonFile,
  clearExportedTasks,
  getExportFilename,
}: RunExportMyDataDependencies) {
  /**
   * Collect -> download -> clear, shared by every surface that triggers
   * "export my data" (command palette, sidebar notice). Callers own
   * presentation (toasts, inline loading state) - this only resolves/rejects.
   */
  return async function runExportMyData(): Promise<void> {
    const data = await collectExportData();
    downloadAsJsonFile(data, getExportFilename());
    // Clearing the legacy tasks table is cleanup, not part of the export the
    // user is waiting on — the download above has already succeeded by this
    // point, so a failure here must not surface as an export failure (which
    // would wrongly invite the user to retry).
    clearExportedTasks().catch(() => {
      // Ignored; the table is retried on the user's next export.
    });
  };
}

export const runExportMyData = createRunExportMyData({
  collectExportData,
  downloadAsJsonFile,
  clearExportedTasks,
  getExportFilename,
});
