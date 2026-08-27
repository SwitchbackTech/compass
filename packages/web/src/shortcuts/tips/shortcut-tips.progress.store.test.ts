import { act, renderHook } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  initialShortcutShowcaseState,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { readShortcutHintProgress } from "@web/shortcuts/tips/shortcut-tips.progress.storage";
import {
  shortcutHintProgressActions,
  useShortcutHintProgress,
} from "@web/shortcuts/tips/shortcut-tips.progress.store";
import { describe, expect, it } from "bun:test";

describe("shortcutHintProgress", () => {
  it("records a demonstrated primitive and notifies subscribers", () => {
    const { result } = renderHook(() => useShortcutHintProgress());
    expect(result.current).toEqual({
      demonstratedIds: [],
      lastUsedId: null,
    });

    act(() => shortcutHintProgressActions.demonstrate("page-jump"));

    expect(result.current).toEqual({
      demonstratedIds: ["page-jump"],
      lastUsedId: "page-jump",
    });
    expect(readShortcutHintProgress()).toEqual({
      demonstratedIds: ["page-jump"],
      lastUsedId: "page-jump",
    });
  });

  it("does not duplicate an already demonstrated id, but updates lastUsedId", () => {
    const { result } = renderHook(() => useShortcutHintProgress());

    act(() => shortcutHintProgressActions.demonstrate("page-jump"));
    act(() => shortcutHintProgressActions.demonstrate("event-jump"));
    act(() => shortcutHintProgressActions.demonstrate("page-jump"));

    expect(result.current).toEqual({
      demonstratedIds: ["page-jump", "event-jump"],
      lastUsedId: "page-jump",
    });
  });

  it("does not persist while the Shortcut Showcase is open", () => {
    useShortcutShowcaseStore.setState({ isActive: true }, false);
    const { result } = renderHook(() => useShortcutHintProgress());

    act(() => shortcutHintProgressActions.demonstrate("page-jump"));

    expect(result.current).toEqual({
      demonstratedIds: [],
      lastUsedId: null,
    });
    expect(readShortcutHintProgress()).toEqual({
      demonstratedIds: [],
      lastUsedId: null,
    });

    useShortcutShowcaseStore.setState(initialShortcutShowcaseState, true);
  });

  it("falls back to empty progress for corrupt storage", () => {
    persistentBrowserStore.set(
      STORAGE_KEYS.SHORTCUT_TIPS_DEMONSTRATED,
      "{not json",
    );

    expect(readShortcutHintProgress()).toEqual({
      demonstratedIds: [],
      lastUsedId: null,
    });
  });

  it("skips unknown ids from storage", () => {
    persistentBrowserStore.set(
      STORAGE_KEYS.SHORTCUT_TIPS_DEMONSTRATED,
      JSON.stringify({
        demonstratedIds: ["page-jump", "not-a-hint"],
        lastUsedId: "also-bad",
      }),
    );

    expect(readShortcutHintProgress()).toEqual({
      demonstratedIds: ["page-jump"],
      lastUsedId: null,
    });
  });
});
