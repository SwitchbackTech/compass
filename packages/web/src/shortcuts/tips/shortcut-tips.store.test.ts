import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  shortcutTipsActions,
  useShortcutTipsStore,
} from "@web/shortcuts/tips/shortcut-tips.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("shortcutTipsActions", () => {
  beforeEach(() => {
    persistentBrowserStore.set(STORAGE_KEYS.SHORTCUT_TIPS_MUTED, "");
    useShortcutTipsStore.setState({
      muted: false,
      mouseStreak: 0,
      activeTipId: null,
      lastShownTipId: null,
      lastRotatedAt: null,
    });
  });

  it("shows a tip on first eligibility", () => {
    shortcutTipsActions.maybeRotate();
    expect(useShortcutTipsStore.getState().activeTipId).not.toBeNull();
  });

  it("does not show a second tip while one is already active", () => {
    shortcutTipsActions.maybeRotate();
    const first = useShortcutTipsStore.getState().activeTipId;
    shortcutTipsActions.maybeRotate();
    expect(useShortcutTipsStore.getState().activeTipId).toBe(first);
  });

  it("respects the cooldown after hide before showing a new tip", () => {
    shortcutTipsActions.maybeRotate();
    shortcutTipsActions.hide();
    expect(useShortcutTipsStore.getState().activeTipId).toBeNull();

    // Cooldown has not elapsed: re-becoming eligible shows nothing.
    shortcutTipsActions.maybeRotate();
    expect(useShortcutTipsStore.getState().activeTipId).toBeNull();
  });

  it("advances through the rotation across cooldown-elapsed cycles", () => {
    shortcutTipsActions.maybeRotate();
    const first = useShortcutTipsStore.getState().activeTipId;
    shortcutTipsActions.hide();
    // Simulate the cooldown having elapsed.
    useShortcutTipsStore.setState({ lastRotatedAt: 0 });
    shortcutTipsActions.maybeRotate();
    const second = useShortcutTipsStore.getState().activeTipId;
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
  });

  it("biases toward edit-sequence after a mouse-driven streak", () => {
    shortcutTipsActions.recordActivity("gridClick");
    shortcutTipsActions.recordActivity("gridClick");
    shortcutTipsActions.recordActivity("gridClick");
    shortcutTipsActions.maybeRotate();
    expect(useShortcutTipsStore.getState().activeTipId).toBe("edit-sequence");
    expect(useShortcutTipsStore.getState().mouseStreak).toBe(0);
  });

  it("a keyboard edit resets an in-progress mouse streak", () => {
    shortcutTipsActions.recordActivity("gridClick");
    shortcutTipsActions.recordActivity("gridClick");
    shortcutTipsActions.recordActivity("keyboardEdit");
    expect(useShortcutTipsStore.getState().mouseStreak).toBe(0);
  });

  it("mute persists and clears the active tip", () => {
    shortcutTipsActions.maybeRotate();
    shortcutTipsActions.mute();
    expect(useShortcutTipsStore.getState().activeTipId).toBeNull();
    expect(persistentBrowserStore.get(STORAGE_KEYS.SHORTCUT_TIPS_MUTED)).toBe(
      "true",
    );
    shortcutTipsActions.maybeRotate();
    expect(useShortcutTipsStore.getState().activeTipId).toBeNull();
  });

  it("actedOn only clears the tip it names", () => {
    useShortcutTipsStore.setState({ activeTipId: "nudge" });
    shortcutTipsActions.actedOn("edit-sequence");
    expect(useShortcutTipsStore.getState().activeTipId).toBe("nudge");
    shortcutTipsActions.actedOn("nudge");
    expect(useShortcutTipsStore.getState().activeTipId).toBeNull();
  });
});
