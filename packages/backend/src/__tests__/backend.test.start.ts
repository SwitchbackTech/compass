import {
  mockNodeModules,
  teardownBackendTestSeams,
} from "@backend/__tests__/helpers/mock.setup";
import { afterAll } from "bun:test";

mockNodeModules();

afterAll(() => {
  teardownBackendTestSeams();
});
