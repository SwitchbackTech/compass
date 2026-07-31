import { faker as mockFaker } from "@faker-js/faker";
import { default as mockMergeWith } from "lodash/mergeWith";
import { mock } from "bun:test";
import { createRequire } from "node:module";

const requireActual = createRequire(import.meta.url);

export const mockBSON = () => {
  mock.module("bson", () => ({
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
  const mockedModule = requireActual(mockPath) as T;

  mock.module(mockPath, () =>
    mockMergeWith(
      { __esModule: mockAsEsModule },
      mockedModule,
      mockFactory(mockedModule),
    ),
  );
}
