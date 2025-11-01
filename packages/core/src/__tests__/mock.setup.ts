export const mockBSON = () => {
  // jest.mock("bson", () => ({
  //   ObjectId: class ObjectId {
  //     #value: string;
  //     constructor(value?: string) {
  //       if (value && !ObjectId.isValid(value)) {
  //         throw new Error("Invalid ObjectId");
  //       }
  //       this.#value = value ?? mockFaker.database.mongodbObjectId();
  //     }
  //     toString() {
  //       return this.#value;
  //     }
  //     static isValid(value?: string | ObjectId): boolean {
  //       return mockZObjectId.safeParse(value).success;
  //     }
  //   },
  // }));
};
