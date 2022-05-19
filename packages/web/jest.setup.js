import { server } from "@web/common/__mocks__/server/mock.server";
import { LocalStorage } from "@web/common/constants/web.constants";
import {
  mockLocalStorage,
  clearLocalStorageMock,
  mockScroll,
} from "@web/common/utils/test.util";

beforeAll(() => {
  mockLocalStorage();
  // eslint-disable-next-line no-undef
  localStorage.setItem(LocalStorage.TOKEN, "secretTokenValue");
  mockScroll();
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
