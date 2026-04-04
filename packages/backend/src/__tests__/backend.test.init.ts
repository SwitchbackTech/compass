import { applyBackendTestEnv } from "@backend/__tests__/helpers/test.env";

const mongoUri = (
  global as unknown as {
    __MONGO_URI__?: string;
  }
).__MONGO_URI__;

applyBackendTestEnv(mongoUri);
