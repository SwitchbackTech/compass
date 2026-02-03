import { useEffect, useState } from "react";

const VERSION_CHECK_INTERVAL = 60000; // Check every 60 seconds

// Check if we're in a webpack dev environment
const IS_DEV =
  typeof BUILD_VERSION === "undefined" ||
  BUILD_VERSION === "dev" ||
  process.env.NODE_ENV === "development";

const CURRENT_VERSION = IS_DEV
  ? "dev"
  : typeof BUILD_VERSION !== "undefined"
    ? BUILD_VERSION
    : "unknown";

interface VersionCheckResult {
  isUpdateAvailable: boolean;
  currentVersion: string;
}

/**
 * Hook to periodically check if a new version of the app is available.
 * Returns true if the deployed version differs from the current running version.
 */
export const useVersionCheck = (): VersionCheckResult => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    // Skip version checking in development
    if (IS_DEV) {
      return;
    }

    const checkVersion = async () => {
      try {
        // Fetch the version from the server with cache-busting
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const serverVersion = data.version;

          // Check if server version differs from current version
          if (serverVersion && serverVersion !== CURRENT_VERSION) {
            setIsUpdateAvailable(true);
          }
        }
      } catch (error) {
        // Silently fail - version check is not critical
        console.debug("Version check failed:", error);
      }
    };

    // Check immediately on mount
    checkVersion();

    // Then check periodically
    const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return {
    isUpdateAvailable,
    currentVersion: CURRENT_VERSION,
  };
};
