import "@testing-library/jest-dom";
import { mockNodeModules } from "@web/__tests__/__mocks__/mock.setup";
import { server } from "@web/__tests__/__mocks__/server/mock.server";

mockNodeModules();

beforeEach(() => jest.clearAllMocks());
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
afterAll(() => jest.restoreAllMocks());
