import { DragOverlay } from "./DragOverlay";
import { describe, expect, it } from "bun:test";

describe("DragOverlay", () => {
  it("mounts a clone and updates it with transform only", () => {
    const clone = document.createElement("div");
    const overlay = new DragOverlay();

    overlay.mount({
      clone,
      rect: { height: 40, left: 10, top: 20, width: 120 },
    });
    overlay.updateTransform({ x: 15, y: 30 });

    expect(document.body.contains(clone)).toBe(true);
    expect(clone.style.left).toBe("10px");
    expect(clone.style.top).toBe("20px");
    expect(clone.style.width).toBe("120px");
    expect(clone.style.height).toBe("40px");
    expect(clone.style.transform).toBe("translate3d(15px, 30px, 0)");

    overlay.updateResize({
      height: 90,
      transform: { x: 0, y: -30 },
      width: 180,
    });

    expect(clone.style.height).toBe("90px");
    expect(clone.style.width).toBe("180px");
    expect(clone.style.transform).toBe("translate3d(0px, -30px, 0)");

    overlay.unmount();

    expect(document.body.contains(clone)).toBe(false);
  });
});
