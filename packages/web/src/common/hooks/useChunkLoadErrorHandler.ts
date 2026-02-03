import { useEffect } from "react";

/**
 * Hook to handle ChunkLoadError by detecting when a chunk fails to load
 * (typically after a deployment) and automatically reloading the page.
 */
export const useChunkLoadErrorHandler = () => {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const isChunkLoadError =
        event.message?.includes("Loading chunk") ||
        event.message?.includes("ChunkLoadError") ||
        event.error?.name === "ChunkLoadError";

      if (isChunkLoadError) {
        console.info(
          "Detected chunk load error - new version available. Reloading page...",
        );

        // Prevent default error handling
        event.preventDefault();

        // Reload the page to get the new chunks
        window.location.reload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const isChunkLoadError =
        event.reason?.message?.includes("Loading chunk") ||
        event.reason?.name === "ChunkLoadError";

      if (isChunkLoadError) {
        console.info(
          "Detected chunk load error - new version available. Reloading page...",
        );

        // Prevent default error handling
        event.preventDefault();

        // Reload the page to get the new chunks
        window.location.reload();
      }
    };

    // Listen for both error events and unhandled promise rejections
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);
};
