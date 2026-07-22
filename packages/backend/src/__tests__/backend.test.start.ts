import { afterAll } from "bun:test";
import { mockNodeModules, teardownBackendTestSeams } from "@backend/__tests__/helpers/mock.setup";

mockNodeModules();

afterAll(() => {
  teardownBackendTestSeams();
});
