// sort-imports-ignore
import { applyBackendTestEnv } from "@backend/__tests__/helpers/test.env";
import "./core.jest-compat";
import "@core/__tests__/core.test.init";
import "@core/__tests__/core.test.start";

applyBackendTestEnv("mongodb://127.0.0.1:27017/test-db");
