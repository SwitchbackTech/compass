import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import {
  getShortcutTips,
  type ShortcutTip,
  type ShortcutTipId,
} from "@web/shortcuts/tips/shortcut-tips.data";
import {
  hasMutedShortcutTips,
  muteShortcutTips,
} from "@web/shortcuts/tips/shortcut-tips.storage";

/** Never rotate in a new tip more often than this, so the strip stays quiet. */
const MIN_ROTATION_INTERVAL_MS = 45_000;
/** Mouse-driven edits in a row before we bias toward the edit-sequence tip. */
const MOUSE_STREAK_THRESHOLD = 3;

export type ShortcutTipsState = {
  muted: boolean;
  /** In-memory only: consecutive mouse-driven edits since the last keyboard one. */
  mouseStreak: number;
  activeTipId: ShortcutTipId | null;
  /** Survives activeTipId being cleared, so rotation keeps advancing through the list. */
  lastShownTipId: ShortcutTipId | null;
  lastRotatedAt: number | null;
};

export const useShortcutTipsStore = create<ShortcutTipsState>()(() => ({
  muted: hasMutedShortcutTips(),
  mouseStreak: 0,
  activeTipId: null,
  lastShownTipId: null,
  lastRotatedAt: null,
}));

function nextTipInRotation(
  tips: ShortcutTip[],
  lastShownTipId: ShortcutTipId | null,
): ShortcutTip {
  if (lastShownTipId === null) return tips[0];
  const lastIndex = tips.findIndex((tip) => tip.id === lastShownTipId);
  return tips[(lastIndex + 1) % tips.length] ?? tips[0];
}

const MOUSE_ACTIVITIES = new Set([
  "gridClick",
  "sidebarClick",
  "dnd",
  "eventRightClick",
  "creating",
]);
const KEYBOARD_ACTIVITIES = new Set(["createShortcut", "keyboardEdit"]);

export const shortcutTipsActions = {
  mute: () => {
    muteShortcutTips();
    useShortcutTipsStore.setState({ muted: true, activeTipId: null });
  },
  /** Tracks mouse-vs-keyboard edit activity to bias which tip shows next. */
  recordActivity: (activity: string | null) => {
    if (activity === null) return;
    if (MOUSE_ACTIVITIES.has(activity)) {
      useShortcutTipsStore.setState((state) => ({
        mouseStreak: state.mouseStreak + 1,
      }));
    } else if (KEYBOARD_ACTIVITIES.has(activity)) {
      useShortcutTipsStore.setState({ mouseStreak: 0 });
    }
  },
  /**
   * Called while a tip is eligible to show (event focused, form closed).
   * The cooldown is tracked independently of `activeTipId` so rapidly
   * refocusing/blurring an event cannot bypass it — re-becoming eligible
   * inside the cooldown window just shows nothing, which is the quiet
   * behavior we want, not a fresh tip every time.
   */
  maybeRotate: () => {
    const state = useShortcutTipsStore.getState();
    if (state.muted) return;
    if (state.activeTipId !== null) return;
    if (
      state.lastRotatedAt !== null &&
      Date.now() - state.lastRotatedAt < MIN_ROTATION_INTERVAL_MS
    ) {
      return;
    }

    const tips = getShortcutTips();
    const biased = state.mouseStreak >= MOUSE_STREAK_THRESHOLD;
    const next = biased
      ? (tips.find((tip) => tip.id === "edit-sequence") ?? tips[0])
      : nextTipInRotation(tips, state.lastShownTipId);

    useShortcutTipsStore.setState({
      activeTipId: next.id,
      lastShownTipId: next.id,
      lastRotatedAt: Date.now(),
      mouseStreak: biased ? 0 : state.mouseStreak,
    });
    track("shortcut_tip_shown", { tip: next.id });
  },
  /** Called when the tip is no longer eligible (focus lost, form opened). */
  hide: () => {
    useShortcutTipsStore.setState({ activeTipId: null });
  },
  /** The user pressed the key the active tip was teaching. */
  actedOn: (tipId: ShortcutTipId) => {
    if (useShortcutTipsStore.getState().activeTipId !== tipId) return;
    track("shortcut_tip_acted_on", { tip: tipId, action: "used" });
    useShortcutTipsStore.setState({ activeTipId: null });
  },
};

export const selectActiveShortcutTipId = (state: ShortcutTipsState) =>
  state.activeTipId;
