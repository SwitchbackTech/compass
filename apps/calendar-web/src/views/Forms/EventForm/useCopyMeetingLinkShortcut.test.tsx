import { KEYMAP } from "@core/shortcuts/keymap";
import { describe, expect, it } from "bun:test";

describe("useCopyMeetingLinkShortcut", () => {
  it("uses the shared keymap binding", () => {
    expect(KEYMAP.copyMeetingLink.hotkey).toBe("Mod+Shift+L");
    expect(KEYMAP.copyMeetingLink.keycaps).toEqual(["Mod", "Shift", "L"]);
  });
});
