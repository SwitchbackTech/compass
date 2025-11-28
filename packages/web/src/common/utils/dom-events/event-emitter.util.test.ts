import {
  globalOnKeyPressHandler,
  globalOnKeyUpHandler,
  keyPressed,
  keyReleased,
} from "./event-emitter.util";

describe("event-emitter.util", () => {
  beforeEach(() => {
    keyPressed.next(null);
  });

  describe("globalOnKeyPressHandler", () => {
    it("should update keyPressed with the key sequence", () => {
      const event = new KeyboardEvent("keydown", { key: "a" });
      globalOnKeyPressHandler(event);

      const value = keyPressed.getValue();
      expect(value?.sequence).toEqual(["a"]);
      expect(value?.event.key).toBe("a");
    });

    it("should accumulate keys in the sequence", () => {
      const event1 = new KeyboardEvent("keydown", {
        key: "Meta",
        metaKey: true,
      });
      globalOnKeyPressHandler(event1);

      const event2 = new KeyboardEvent("keydown", { key: "k", metaKey: true });
      globalOnKeyPressHandler(event2);

      const value = keyPressed.getValue();
      expect(value?.sequence).toEqual(["Meta", "k"]);
      expect(value?.event.key).toBe("k");
    });

    it("should handle repeated keys", () => {
      const event1 = new KeyboardEvent("keydown", { key: "a" });
      globalOnKeyPressHandler(event1);

      const event2 = new KeyboardEvent("keydown", { key: "a", repeat: true });
      globalOnKeyPressHandler(event2);

      const value = keyPressed.getValue();
      expect(value?.sequence).toEqual(["a"]);
      expect(value?.event.key).toBe("a");
    });
  });

  describe("globalOnKeyUpHandler", () => {
    it("should emit to keyReleased", (done) => {
      const event = new KeyboardEvent("keyup", { key: "a" });

      // Setup initial state as if 'a' was pressed
      keyPressed.next({
        event: new KeyboardEvent("keydown", { key: "a" }),
        sequence: ["a"],
      });

      const subscription = keyReleased.subscribe((val) => {
        expect(val.sequence).toEqual(["a"]);
        expect(val.event.key).toBe("a");
        subscription.unsubscribe();
        done();
      });

      globalOnKeyUpHandler(event);
    });

    it("should reset keyPressed if the first key in sequence is released", () => {
      const eventDown = new KeyboardEvent("keydown", { key: "Meta" });
      keyPressed.next({ event: eventDown, sequence: ["Meta", "k"] });

      const eventUp = new KeyboardEvent("keyup", { key: "Meta" });
      globalOnKeyUpHandler(eventUp);

      expect(keyPressed.getValue()).toBeNull();
    });

    it("should not reset keyPressed if a non-first key is released", () => {
      const eventDown = new KeyboardEvent("keydown", { key: "k" });
      keyPressed.next({ event: eventDown, sequence: ["Meta", "k"] });

      const eventUp = new KeyboardEvent("keyup", { key: "k" });
      globalOnKeyUpHandler(eventUp);

      expect(keyPressed.getValue()).not.toBeNull();
      expect(keyPressed.getValue()?.sequence).toEqual(["Meta", "k"]);
    });
  });
});
