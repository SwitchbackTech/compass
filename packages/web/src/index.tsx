import "react-datepicker/dist/react-datepicker.css";
import { createRoot } from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import { sessionInit } from "@web/auth/SessionProvider";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { initializeDatabase } from "@web/common/utils/storage/db-init.util";
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
  try {
    await initializeDatabase();
    console.log("[App] Database initialized successfully");
  } catch (error) {
    console.error("[App] Database initialization failed:", error);
  }

  sagaMiddleware.run(sagas);
  sessionInit();

  root.render(<App />);
}

initializeApp();
