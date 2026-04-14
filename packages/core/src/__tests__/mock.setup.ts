import { faker as mockFaker } from "@faker-js/faker";
import { deepMerge as mockDeepMerge } from "@core/util/object.util";

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

      static isValid(value?: string) {
        return /^[a-fA-F0-9]{24}$/.test(value ?? "");
      }
    },
  }));
};

export function mockModule<T extends object>(
  mockPath: string,
  mockFactory: (mockedModule: T) => object = () => ({}),
  mockAsEsModule = true,
) {
  const mockedModule = jest.requireActual<T>(mockPath);

  jest.mock(mockPath, () =>
    mockDeepMerge(
      { __esModule: mockAsEsModule },
      mockedModule as object,
      mockFactory(mockedModule),
    ),
  );
}
