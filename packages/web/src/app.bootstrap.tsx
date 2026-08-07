import "react-datepicker/dist/react-datepicker.css";
import { createRoot } from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import { sessionInit } from "@web/auth/compass/session/SessionProvider";
import { configureGoogleRevocationApiHandler } from "@web/auth/google/util/google-revocation-api.config";
import { track } from "@web/auth/posthog/track";
import {
  initializeDatabaseWithErrorHandling,
  showDbInitErrorToast,
} from "@web/common/utils/app-init.util";
import { App } from "@web/components/App/App";
import "./index.css";

export async function bootstrapApp(): Promise<void> {
  configureGoogleRevocationApiHandler();

  // Read before the router mounts: validateAuthSearch strips unrecognized
  // query params (like these) on the first navigation.
  const connectParams = new URLSearchParams(window.location.search);
  if (
    connectParams.get("provider") === "google" &&
    connectParams.get("status") === "connected"
  ) {
    track("calendar_connected");
  }

  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root container with id 'root' not found in index.html");
  }

  const root = createRoot(container);
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
