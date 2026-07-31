import "react-datepicker/dist/react-datepicker.css";
import { createRoot } from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import { sessionInit } from "@web/auth/compass/session/SessionProvider";
import { configureGoogleRevocationApiHandler } from "@web/auth/google/util/google-revocation-api.config";
import {
  getPosthogClient,
  initPosthog,
} from "@web/auth/posthog/posthog.bootstrap";
import {
  initializeDatabaseWithErrorHandling,
  showDbInitErrorToast,
} from "@web/common/utils/app-init.util";
import { reloadLocation } from "@web/common/utils/browser/browser-navigation.util";
import { App } from "@web/components/App/App";
import "./index.css";

// Initialize PostHog before anything else awaits: this installs its
// unhandled-error/rejection handlers up front, so a throw during the IndexedDB
// or sessionInit() boot below is captured instead of leaving a silent blank
// page (session 019fb57e).
initPosthog();

configureGoogleRevocationApiHandler();

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container with id 'root' not found in index.html");
}

const root = createRoot(container);

/**
 * Initialize the application after local storage is ready.
 * This ensures IndexedDB is ready before any database operations occur.
 */
async function initializeApp() {
  const { dbInitError } = await initializeDatabaseWithErrorHandling();
  // biome-ignore lint/suspicious/noConsole: Don't remove this plz.
  console.debug(
    "aHR0cHM6Ly9jb21wYXNzY2FsZW5kYXIubm90aW9uLnNpdGUvaDNsbDAtZGF0LTMwYzIzN2JkZThmNDgwNTdhZmYxZDRiODU0YjAzMjYz",
  );
  sessionInit();

  root.render(<App />);

  // Show error toast after app renders (so toast container is available)
  if (dbInitError) {
    console.error(dbInitError);
    showDbInitErrorToast(dbInitError);
  }
}

// A throw here (before <App/> mounts, so before any React error boundary
// exists) would otherwise leave a blank page with no telemetry. Report it and
// surface a minimal reload prompt so boot failures are visible and recoverable.
initializeApp().catch((error) => {
  getPosthogClient()?.captureException(error, {
    $exception_handled: false,
    $exception_source: "app-boot",
  });
  console.error("Failed to initialize the app:", error);
  container.innerHTML =
    '<div class="c-not-found gap-4 px-6 text-center">' +
    '<h1 class="font-[VT323,monospace] text-4xl">🏴‍☠️ We ran aground!</h1>' +
    '<p class="max-w-xl text-text-muted text-xl">The app failed to start.</p>' +
    '<button type="button" id="boot-reload" class="mt-5 cursor-pointer rounded border-2 border-border bg-accent-secondary px-4 py-2 font-semibold text-[16px] text-on-accent transition-all duration-200 ease-in-out hover:brightness-120">Reload the app</button>' +
    "</div>";
  container
    .querySelector("#boot-reload")
    ?.addEventListener("click", () => reloadLocation());
});
