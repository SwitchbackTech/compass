import { applyBackendTestEnv } from "@scripts/testing/backend-test-env";

const mongoUri = (global as unknown as { __MONGO_URI__: string }).__MONGO_URI__;

applyBackendTestEnv(mongoUri ?? process.env["MONGO_URL"] ?? "");
