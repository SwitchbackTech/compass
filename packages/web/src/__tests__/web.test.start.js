import { server } from "@web/__tests__/__mocks__/server/mock.server";
import {
  clearLocalStorageMock,
  mockResizeObserver,
  mockScroll,
} from "@web/__tests__/utils/test.util";

beforeAll(() => {
  mockScroll();
  mockResizeObserver();

  server.listen();
});

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => {
  server.close();

  clearLocalStorageMock();
});
