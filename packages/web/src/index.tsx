import "react-datepicker/dist/react-datepicker.css";
import { createRoot } from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import { sessionInit } from "@web/auth/compass/session/SessionProvider";
import { configureGoogleRevocationApiHandler } from "@web/auth/google/util/google-revocation-api.config";
import {
  initializeDatabaseWithErrorHandling,
  showDbInitErrorToast,
} from "@web/common/utils/app-init.util";
import { App } from "@web/components/App/App";
import "./index.css";

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

initializeApp();
