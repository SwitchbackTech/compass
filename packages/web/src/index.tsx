import { createRoot } from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import { App } from "./App";
import "./index.css";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(<App />);
