import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
import { mockNodeModules } from "@web/__tests__/__mocks__/mock.setup";
import { server } from "@web/__tests__/__mocks__/server/mock.server";

// Polyfill structuredClone for fake-indexeddb
if (typeof global.structuredClone === "undefined") {
  global.structuredClone = (obj: unknown) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

mockNodeModules();

beforeEach(() => jest.clearAllMocks());
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
afterAll(() => jest.restoreAllMocks());
