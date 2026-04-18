import { faker as mockFaker } from "@faker-js/faker";
import { default as mockMergeWith } from "lodash.mergewith";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const bunTest = (() => {
  try {
    return require("bun:test") as {
      mock: {
        module: (id: string, factory: () => object) => void;
      };
    };
  } catch {
    return null;
  }
})();

export const mockBSON = () => {
  if (bunTest) {
    bunTest.mock.module("bson", () => ({
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

        static isValid(value?: string) {
          return /^[a-fA-F0-9]{24}$/.test(value ?? "");
        }
      },
    }));

    return;
  }

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

      static isValid(value?: string) {
        return /^[a-fA-F0-9]{24}$/.test(value ?? "");
      }
    },
  }));
};

export function mockModule<T>(
  mockPath: string,
  mockFactory: (mockedModule: T) => object = () => ({}),
  mockAsEsModule = true,
) {
  const mockedModule = jest.requireActual(mockPath);

  jest.mock<T>(mockPath, () =>
    mockMergeWith(
      { __esModule: mockAsEsModule },
      mockedModule,
      mockFactory(mockedModule),
    ),
  );
}
