// Establish API mocking before all tests.
import { server } from "@web/common/__mocks__/server/mock.server";

beforeAll(() => {
  server.listen();
});

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());
