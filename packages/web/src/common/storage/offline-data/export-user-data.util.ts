import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type OfflineDataStore } from "@web/common/storage/offline-data/offline-data.store";
import {
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
} from "@web/common/storage/offline-data/offline-data.store.registry";

const SOMEDAY_EVENTS_NOTICE =
  "Someday events aren't included in this file. If you had any, they'll be emailed to you separately by tyler@switchback.tech.";

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

// Public by necessity: this fires from the browser. Rotate the URL in the
// Discord channel settings if it's ever spammed or leaked in ways that matter.
const EXPORT_NOTIFY_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1526960288878952685/5OP3VrtAAdllsUlmPZ1N9f4tox6xTq5PWSmCH8aoUcd0oJDcdyj52XisVE_1blxH0Qb-";

/**
 * Best-effort notification so a someday-events export can be handled by
 * hand; failure here must never block or fail the data export itself.
 */
export function notifyExport(email: string): void {
  fetch(EXPORT_NOTIFY_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: `Compass data export: ${email}` }),
  }).catch(() => {
    // Best-effort notification only; the export itself must not fail if
    // Discord is unreachable.
  });
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
  notifyExport: typeof notifyExport;
  getExportFilename: typeof getExportFilename;
};

export function createRunExportMyData({
  collectExportData,
  downloadAsJsonFile,
  clearExportedTasks,
  notifyExport,
  getExportFilename,
}: RunExportMyDataDependencies) {
  /**
   * Collect -> download -> notify -> clear, shared by every surface that
   * triggers "export my data" (command palette, sidebar notice). Callers own
   * presentation (toasts, inline loading state) - this only resolves/rejects.
   */
  return async function runExportMyData(email: string): Promise<void> {
    const data = await collectExportData();
    downloadAsJsonFile(data, getExportFilename());
    // notifyExport is best-effort and already swallows its own failures (see
    // its own implementation) — it can't fail the export the user is waiting on.
    notifyExport(email);
    // Clearing the legacy tasks table is cleanup, not part of the export the
    // user is waiting on — the download and webhook above have already
    // succeeded by this point, so a failure here must not surface as an
    // export failure (which would wrongly invite the user to retry).
    clearExportedTasks().catch(() => {
      // Ignored; the table is retried on the user's next export.
    });
  };
}

export const runExportMyData = createRunExportMyData({
  collectExportData,
  downloadAsJsonFile,
  clearExportedTasks,
  notifyExport,
  getExportFilename,
});
