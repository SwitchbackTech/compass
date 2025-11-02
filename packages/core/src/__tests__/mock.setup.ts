import { faker as mockFaker } from "@faker-js/faker";

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
};
