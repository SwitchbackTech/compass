import {
  domMovement$,
  getElementAtPoint,
  globalMovementHandler,
  pressKey,
} from "@web/common/utils/dom/event-emitter.util";

describe("event-emitter.util", () => {
  beforeEach(() => {
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

      globalMovementHandler(
        event as unknown as Parameters<typeof globalMovementHandler>[0],
      );
    });
  });

  describe("pressKey", () => {
    it("should dispatch bubbling keydown and keyup events", () => {
      const target = document.createElement("div");
      const keydownSpy = jest.fn();
      const keyupSpy = jest.fn();
      const documentKeydownSpy = jest.fn();

      document.body.appendChild(target);
      target.addEventListener("keydown", keydownSpy);
      target.addEventListener("keyup", keyupSpy);
      document.addEventListener("keydown", documentKeydownSpy);

      pressKey("Enter", {}, target);

      expect(keydownSpy).toHaveBeenCalledTimes(1);
      expect(keyupSpy).toHaveBeenCalledTimes(1);
      expect(documentKeydownSpy).toHaveBeenCalledTimes(1);
      expect(keydownSpy.mock.calls[0][0]).toMatchObject({
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      expect(keyupSpy.mock.calls[0][0].key).toBe("Enter");

      document.removeEventListener("keydown", documentKeydownSpy);
      document.body.removeChild(target);
    });
  });
});
