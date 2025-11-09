import EventEmitter from "node:events";
import { waitUntilEvent } from "@core/util/wait-until-event.util";

describe("waitUntilEvent", () => {
  it("waits for event to complete before resolving", async () => {
    const emitter = new EventEmitter();

    await expect(
      waitUntilEvent(emitter, "test-event", 100, () =>
        Promise.resolve(emitter.emit("test-event", "event-payload")),
      ),
    ).resolves.toEqual(["event-payload"]);
  });

  it("it throws an error with a failure reason if the event wait exceeds a timeout", async () => {
    const emitter = new EventEmitter();

    await expect(
      waitUntilEvent(
        emitter,
        "test-event",
        1,
        () =>
          new Promise((resolve) => {
            const timeout = setTimeout(() => {
              clearTimeout(timeout);
              resolve(emitter.emit("test-event", "event-payload"));
            }, 2);
          }),
      ),
    ).rejects.toThrow("Operation timed out. Wait for test-event timed out");
  });

  it("it transforms the result using the `afterEvent` callback", async () => {
    const emitter = new EventEmitter();

    await expect(
      waitUntilEvent<[string], string>(
        emitter,
        "test-event",
        100,
        () => Promise.resolve(emitter.emit("test-event", "event-payload")),
        (payload) => Promise.resolve(payload.split("").reverse().join("")),
      ),
    ).resolves.toEqual("event-payload".split("").reverse().join(""));
  });

  it("it throws an error if the `beforeEvent` callback fails", async () => {
    const emitter = new EventEmitter();

    await expect(
      waitUntilEvent(emitter, "test-event", 1, () => {
        throw new Error("reject operation");
      }),
    ).rejects.toThrow("reject operation");
  });
});
