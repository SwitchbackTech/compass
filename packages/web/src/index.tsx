import React from "react";
import { createRoot } from "react-dom/client";
// import { RouterProvider } from "react-router-dom";

import { App } from "./App";
// import { router } from "./routers";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(<App />);
// root.render(<RouterProvider router={router} />);
