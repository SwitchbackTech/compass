import "react-datepicker/dist/react-datepicker.css";
import { createRoot } from "react-dom/client";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { sessionInit } from "@web/auth/session/SessionProvider";
import { sagaMiddleware } from "@web/common/store/middlewares";
import {
  DatabaseInitError,
  initializeDatabase,
} from "@web/common/utils/storage/db-init.util";
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
  let dbInitError: DatabaseInitError | null = null;

  try {
    await initializeDatabase();
  } catch (error) {
    if (error instanceof DatabaseInitError) {
      dbInitError = error;
    }
    // Continue app initialization - the app can still work without local storage
    // by falling back to remote-only mode when authenticated
  }

  sagaMiddleware.run(sagas);
  sessionInit();

  root.render(<App />);

  // Show error toast after app renders (so toast container is available)
  if (dbInitError) {
    // Use setTimeout to ensure toast container is mounted
    setTimeout(() => {
      toast.error(
        `Offline storage unavailable: ${dbInitError.message}. Your data will not be saved locally.`,
        {
          autoClose: false,
          position: "bottom-right",
        },
      );
    }, 100);
  }
}

initializeApp();
