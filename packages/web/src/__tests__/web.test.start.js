import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { mockResizeObserver } from "./__mocks__/mock.resize-observer";
import { mockScroll } from "./__mocks__/mock.scroll";

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
});
