import "react-datepicker/dist/react-datepicker.css";
import { createRoot } from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import { sessionInit } from "@web/auth/session/SessionProvider";
import { sagaMiddleware } from "@web/common/store/middlewares";
import {
  initializeDatabaseWithErrorHandling,
  showDbInitErrorToast,
} from "@web/common/utils/app-init.util";
import { App } from "@web/components/App/App";
import { sagas } from "@web/store/sagas";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container with id 'root' not found in index.html");
}

const root = createRoot(container);

/**
 * Initialize the application with database setup before starting sagas.
 * This ensures IndexedDB is ready before any database operations occur.
 */
async function initializeApp() {
  const { dbInitError } = await initializeDatabaseWithErrorHandling();
  console.debug(
    "aHR0cHM6Ly9jb21wYXNzY2FsZW5kYXIubm90aW9uLnNpdGUvaDNsbDAtZGF0LTMwYzIzN2JkZThmNDgwNTdhZmYxZDRiODU0YjAzMjYz",
  );
  sagaMiddleware.run(sagas);
  sessionInit();

  root.render(<App />);

  // Show error toast after app renders (so toast container is available)
  if (dbInitError) {
    console.error(dbInitError);
    showDbInitErrorToast(dbInitError);
  }
}

initializeApp();
