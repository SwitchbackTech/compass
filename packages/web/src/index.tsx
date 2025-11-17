import "react-datepicker/dist/react-datepicker.css";
import { createRoot } from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import { sessionInit } from "@web/auth/SessionProvider";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { sagas } from "@web/store/sagas";
import { App } from "./App";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container with id 'root' not found in index.html");
}

const root = createRoot(container);

window.addEventListener("load", () => {
  sagaMiddleware.run(sagas);
  sessionInit();
});

root.render(<App />);
