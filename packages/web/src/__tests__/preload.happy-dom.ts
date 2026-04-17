import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { mock } from "bun:test";

GlobalRegistrator.register();

process.env["API_BASEURL"] = "http://localhost:3000";
process.env["BACKEND_BASEURL"] = "http://localhost:3000";
process.env["NODE_ENV"] = "test";

mock.module("@web/common/constants/env.constants", () => ({
  ENV_WEB: {
    API_BASEURL: "http://localhost:3000",
    BACKEND_BASEURL: "http://localhost:3000",
    NODE_ENV: "test",
  },
  IS_DEV: false,
}));
