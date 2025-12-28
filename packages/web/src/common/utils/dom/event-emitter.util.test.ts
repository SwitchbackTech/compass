import {
  domMovement$,
  getElementAtPoint,
  globalMovementHandler,
  globalOnKeyPressHandler,
  globalOnKeyUpHandler,
  keyPressed$,
  keyReleased$,
  pressKey,
} from "@web/common/utils/dom/event-emitter.util";

describe("event-emitter.util", () => {
  beforeEach(() => {
    keyPressed$.next(null);
    jest.clearAllMocks();
  });

  describe("getElementAtPoint", () => {
    it("should return element at position", () => {
      const mockElement = document.createElement("div");

      document.elementFromPoint = jest.fn().mockReturnValue(mockElement);

      const element = getElementAtPoint({ clientX: 10, clientY: 10 });

      expect(document.elementFromPoint).toHaveBeenCalledWith(10, 10);
      expect(element).toBe(mockElement);
    });
  });

  describe("globalMovementHandler", () => {
    it("should handle pointer movement events", (done) => {
      const mockElement = document.createElement("div");
      document.elementFromPoint = jest.fn().mockReturnValue(mockElement);

      const event = new PointerEvent("pointermove", {
        clientX: 100,
        clientY: 100,
      });

      const subscription = domMovement$.subscribe((val) => {
        expect(val.x).toBe(100);
        expect(val.y).toBe(100);
        expect(val.element).toBe(mockElement);
        expect(val.event).toBe(event);
        subscription.unsubscribe();
        done();
      });

      globalMovementHandler(event);
    });
  });

  describe("pressKey", () => {
    it("should dispatch keydown and keyup events", () => {
      const target = document.createElement("div");
      const keydownSpy = jest.fn();
      const keyupSpy = jest.fn();

      target.addEventListener("keydown", keydownSpy);
      target.addEventListener("keyup", keyupSpy);

      pressKey("Enter", {}, target);

      expect(keydownSpy).toHaveBeenCalledTimes(1);
      expect(keyupSpy).toHaveBeenCalledTimes(1);
      expect(keydownSpy.mock.calls[0][0].key).toBe("Enter");
      expect(keyupSpy.mock.calls[0][0].key).toBe("Enter");
    });
  });

  describe("globalOnKeyPressHandler", () => {
    it("should update keyPressed with the key sequence", () => {
      const event = new KeyboardEvent("keydown", { key: "a" });
      globalOnKeyPressHandler(event);

      const value = keyPressed$.getValue();
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

      const value = keyPressed$.getValue();
      expect(value?.sequence).toEqual(["Meta", "k"]);
      expect(value?.event.key).toBe("k");
    });

    it("should handle repeated keys", () => {
      const event1 = new KeyboardEvent("keydown", { key: "a" });
      globalOnKeyPressHandler(event1);

      const event2 = new KeyboardEvent("keydown", { key: "a", repeat: true });
      globalOnKeyPressHandler(event2);

      const value = keyPressed$.getValue();
      expect(value?.sequence).toEqual(["a"]);
      expect(value?.event.key).toBe("a");
    });
  });

  describe("globalOnKeyUpHandler", () => {
    it("should emit to keyReleased", (done) => {
      const event = new KeyboardEvent("keyup", { key: "a" });

      // Setup initial state as if 'a' was pressed
      keyPressed$.next({
        event: new KeyboardEvent("keydown", { key: "a" }),
        sequence: ["a"],
      });

      const subscription = keyReleased$.subscribe((val) => {
        expect(val.sequence).toEqual(["a"]);
        expect(val.event.key).toBe("a");
        subscription.unsubscribe();
        done();
      });

      globalOnKeyUpHandler(event);
    });

    it("should reset keyPressed if the first key in sequence is released", () => {
      const eventDown = new KeyboardEvent("keydown", { key: "Meta" });
      keyPressed$.next({ event: eventDown, sequence: ["Meta", "k"] });

      const eventUp = new KeyboardEvent("keyup", { key: "Meta" });
      globalOnKeyUpHandler(eventUp);

      expect(keyPressed$.getValue()).toBeNull();
    });

    it("should not reset keyPressed if a non-first key is released", () => {
      const eventDown = new KeyboardEvent("keydown", { key: "k" });
      keyPressed$.next({ event: eventDown, sequence: ["Meta", "k"] });

      const eventUp = new KeyboardEvent("keyup", { key: "k" });
      globalOnKeyUpHandler(eventUp);

      expect(keyPressed$.getValue()).not.toBeNull();
      expect(keyPressed$.getValue()?.sequence).toEqual(["Meta", "k"]);
    });
  });
});
