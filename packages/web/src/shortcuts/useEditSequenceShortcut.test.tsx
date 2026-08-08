import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { clearAppLockReasons, setAppLockReason } from "@web/shortcuts/app-lock";
import { useEditSequenceShortcut } from "@web/shortcuts/useEditSequenceShortcut";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";

describe("useEditSequenceShortcut", () => {
  beforeEach(() => {
    clearAppLockReasons();
    setSystemTime(new Date("2026-05-20T12:00:00.000Z"));
  });

  afterEach(() => {
    clearAppLockReasons();
    document.body.innerHTML = "";
    setSystemTime();
  });

  it("fires the mapped field for e then t", () => {
    const onSequence = mock(() => {});
    renderHook(() => useEditSequenceShortcut({ onSequence }));

    pressKey("e");
    pressKey("t");

    expect(onSequence).toHaveBeenCalledTimes(1);
    expect(onSequence).toHaveBeenCalledWith("title");
  });

  it("disarms silently after the arm window without firing", () => {
    const onSequence = mock(() => {});
    renderHook(() => useEditSequenceShortcut({ onSequence }));

    pressKey("e");
    setSystemTime(new Date("2026-05-20T12:00:00.700Z"));
    pressKey("t");

    expect(onSequence).not.toHaveBeenCalled();
  });

  it("does not preventDefault an unmapped second key", () => {
    const onSequence = mock(() => {});
    const seen = mock((_event: KeyboardEvent) => {});
    renderHook(() => useEditSequenceShortcut({ onSequence }));
    document.addEventListener("keydown", seen, true);

    pressKey("e");
    pressKey("j");

    expect(onSequence).not.toHaveBeenCalled();
    const jEvents = seen.mock.calls
      .map(([event]) => event as KeyboardEvent)
      .filter((event) => event.key === "j");
    expect(jEvents.length).toBeGreaterThan(0);
    expect(jEvents.every((event) => event.defaultPrevented === false)).toBe(
      true,
    );

    document.removeEventListener("keydown", seen, true);
  });

  it("preventsDefault the follow key's keyup so nav chords stay quiet", () => {
    const onSequence = mock(() => {});
    const seen = mock((_event: KeyboardEvent) => {});
    renderHook(() => useEditSequenceShortcut({ onSequence }));
    document.addEventListener("keyup", seen, true);

    pressKey("e");
    pressKey("t");

    expect(onSequence).toHaveBeenCalledWith("title");
    const tUps = seen.mock.calls
      .map(([event]) => event as KeyboardEvent)
      .filter((event) => event.key === "t");
    expect(tUps.length).toBeGreaterThan(0);
    expect(tUps.every((event) => event.defaultPrevented === true)).toBe(true);

    document.removeEventListener("keyup", seen, true);
  });

  it("stays inert while typing in an input", () => {
    const onSequence = mock(() => {});
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useEditSequenceShortcut({ onSequence }));
    pressKey("e", {}, input);
    pressKey("t", {}, input);

    expect(onSequence).not.toHaveBeenCalled();
  });

  it("stays inert while the app lock is held", () => {
    const onSequence = mock(() => {});
    setAppLockReason("test-lock", true);

    renderHook(() => useEditSequenceShortcut({ onSequence }));
    pressKey("e");
    pressKey("t");

    expect(onSequence).not.toHaveBeenCalled();
  });

  it("maps each shipped follow key to its form field", () => {
    const onSequence = mock(() => {});
    renderHook(() => useEditSequenceShortcut({ onSequence }));

    const cases = [
      ["t", "title"],
      ["d", "description"],
      ["s", "start"],
      ["e", "end"],
      ["r", "recurrence"],
      ["c", "calendar"],
    ] as const;

    for (const [second, field] of cases) {
      onSequence.mockClear();
      pressKey("e");
      pressKey(second);
      expect(onSequence).toHaveBeenCalledWith(field);
    }
  });
});
