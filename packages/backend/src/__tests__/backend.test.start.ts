import { mockNodeModules } from "@backend/__tests__/helpers/mock.setup";
import { afterAll, beforeEach } from "bun:test";

mockNodeModules();

beforeEach(() => jest.clearAllMocks());

afterAll(() => jest.restoreAllMocks());
