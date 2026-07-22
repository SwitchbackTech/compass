import mongoService from "./mongo.service";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

describe("MongoService", () => {
  afterEach(async () => {
    await mongoService.stop();
  });

  it("starts after MongoClient connect resolves even when no open event is emitted", async () => {
    const collection = mock((name: string) => ({ collectionName: name }));
    const db = { collection };
    const client = {
      close: mock(),
      db: mock(() => db),
      removeAllListeners: mock(),
    };

    spyOn(mongoService, "reconnect").mockResolvedValue(client as never);

    await expect(mongoService.start()).resolves.toBe(mongoService);

    expect(client.db).toHaveBeenCalledWith(expect.any(String));
    expect(collection).toHaveBeenCalledWith("calendar");
    expect(collection).toHaveBeenCalledWith("event");
    expect(collection).toHaveBeenCalledWith("sync");
    expect(collection).toHaveBeenCalledWith("user");
    expect(collection).toHaveBeenCalledWith("watch");
  });
});
