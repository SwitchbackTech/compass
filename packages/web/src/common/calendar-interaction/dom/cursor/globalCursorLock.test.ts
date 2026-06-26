import { lockGlobalCursor } from "./globalCursorLock";
import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
  document.documentElement.className = "";
});

describe("lockGlobalCursor", () => {
  it("adds the cursor class while locked and removes it on release", () => {
    const release = lockGlobalCursor("move");

    expect(document.documentElement.classList.contains("cursor-move")).toBe(
      true,
    );

    release();

    expect(document.documentElement.classList.contains("cursor-move")).toBe(
      false,
    );
  });

  it("has an idempotent release (repeated calls are safe)", () => {
    const release = lockGlobalCursor("move");

    release();
    release();

    expect(document.documentElement.classList.contains("cursor-move")).toBe(
      false,
    );
  });

  it("tracks distinct cursors independently", () => {
    const releaseMove = lockGlobalCursor("move");
    const releaseResize = lockGlobalCursor("row-resize");

    expect(document.documentElement.classList.contains("cursor-move")).toBe(
      true,
    );
    expect(
      document.documentElement.classList.contains("cursor-row-resize"),
    ).toBe(true);

    releaseMove();
    expect(document.documentElement.classList.contains("cursor-move")).toBe(
      false,
    );
    expect(
      document.documentElement.classList.contains("cursor-row-resize"),
    ).toBe(true);

    releaseResize();
    expect(
      document.documentElement.classList.contains("cursor-row-resize"),
    ).toBe(false);
  });
});
