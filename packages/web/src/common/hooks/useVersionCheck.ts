import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { IS_DEV } from "@web/common/constants/env.constants";

const MIN_HIDDEN_DURATION_MS = 30_000;
const BACKUP_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const CURRENT_VERSION =
  typeof BUILD_VERSION === "string" ? BUILD_VERSION : "dev";
const versionResponseSchema = z.object({
  version: z.string().optional(),
});

export interface VersionCheckResult {
  isUpdateAvailable: boolean;
  currentVersion: string;
}

/**
 * Checks for new application versions by polling `/version.json`.
 *
 * Performs version checks:
 * - On initial mount
 * - When the tab becomes visible after being hidden for 30+ seconds
 * - Every 5 minutes as a backup poll
 *
 * Disabled in development mode.
 */
export const useVersionCheck = (): VersionCheckResult => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const hiddenAtRef = useRef<number | null>(null);
  const isCheckingRef = useRef(false);

  const checkVersion = useCallback(async () => {
    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;

    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.ok) {
        return;
      }

      const parsedResponse = versionResponseSchema.safeParse(
        await response.json(),
      );

      if (!parsedResponse.success) {
        return;
      }

      const { version: serverVersion } = parsedResponse.data;

      if (!serverVersion) {
        return;
      }

      setIsUpdateAvailable(serverVersion !== CURRENT_VERSION);
    } catch (error) {
      console.error("Version check failed:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (IS_DEV) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (document.visibilityState !== "visible") {
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;

      if (hiddenAt === null) {
        return;
      }

      const hiddenDuration = Date.now() - hiddenAt;
      if (hiddenDuration >= MIN_HIDDEN_DURATION_MS) {
        checkVersion();
      }
    };

    checkVersion();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const backupInterval = window.setInterval(
      checkVersion,
      BACKUP_CHECK_INTERVAL_MS,
    );

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(backupInterval);
    };
  }, [checkVersion]);

  return { isUpdateAvailable, currentVersion: CURRENT_VERSION };
};
