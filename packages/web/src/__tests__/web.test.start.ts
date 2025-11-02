import { faker as mockFaker } from "@faker-js/faker";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import {
  clearLocalStorageMock,
  mockResizeObserver,
  mockScroll,
} from "@web/__tests__/utils/web.test.util";

export const mockBSON = () => {
  jest.mock("bson", () => ({
    ObjectId: class ObjectId {
      #value: string;

      constructor(value?: string) {
        if (value && !ObjectId.isValid(value)) {
          throw new Error("Invalid ObjectId");
        }

        this.#value = value ?? mockFaker.database.mongodbObjectId();
      }

      toString() {
        return this.#value;
      }

      equals(value?: unknown): boolean {
        return this.toString() === value?.toString();
      }

      static isValid(value?: unknown): boolean {
        return /^[a-fA-F0-9]{24}$/.test(value?.toString() ?? "");
      }
    },
  }));

  beforeAll(() => import("bson"));
};

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
