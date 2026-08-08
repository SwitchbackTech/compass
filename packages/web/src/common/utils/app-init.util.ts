import { initializeOfflineDataStore } from "@web/common/storage/offline-data/offline-data.store.registry";
import { getToast } from "@web/common/utils/toast/toast.port";

export class DatabaseInitError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DatabaseInitError";
  }
}

export interface AppInitResult {
  dbInitError: DatabaseInitError | null;
}

/** Initialize offline storage; return any init error so the app can keep running. */
export async function initializeDatabaseWithErrorHandling(
  initialize: typeof initializeOfflineDataStore = initializeOfflineDataStore,
): Promise<AppInitResult> {
  let dbInitError: DatabaseInitError | null = null;

  try {
    await initialize();
  } catch (error) {
    if (error instanceof DatabaseInitError) {
      dbInitError = error;
    }
    // Continue without local storage — authenticated users can use remote-only mode
  }

  return { dbInitError };
}

/**
 * Defer toast until after the next paint so ToastContainer from `root.render`
 * has mounted. Double rAF waits for commit + paint without an arbitrary delay.
 */
export function showDbInitErrorToast(dbInitError: DatabaseInitError): void {
  const show = () => {
    getToast().error(
      `Compass can't use offline storage right now: ${dbInitError.message}. Your changes won't be saved on this device.`,
      {
        autoClose: false,
        position: "bottom-right",
      },
    );
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(show);
  });
}
