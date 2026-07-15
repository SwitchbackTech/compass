import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type OfflineDataStore } from "@web/common/storage/offline-data/offline-data.store";
import {
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
} from "@web/common/storage/offline-data/offline-data.store.registry";

interface CompassDataExport {
  exportedAt: string;
  version: 1;
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
