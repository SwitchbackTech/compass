import mongoService from "./mongo.service";

describe("MongoService", () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await mongoService.stop();
  });

  it("starts after MongoClient connect resolves even when no open event is emitted", async () => {
    const collection = jest.fn((name: string) => ({ collectionName: name }));
    const db = { collection };
    const client = {
      close: jest.fn(),
      db: jest.fn(() => db),
      removeAllListeners: jest.fn(),
    };

    jest.spyOn(mongoService, "reconnect").mockResolvedValue(client as never);

    await expect(mongoService.start()).resolves.toBe(mongoService);

    expect(client.db).toHaveBeenCalledWith(expect.any(String));
    expect(collection).toHaveBeenCalledWith("calendar");
    expect(collection).toHaveBeenCalledWith("event");
    expect(collection).toHaveBeenCalledWith("priority");
    expect(collection).toHaveBeenCalledWith("sync");
    expect(collection).toHaveBeenCalledWith("user");
    expect(collection).toHaveBeenCalledWith("watch");
  });
});
