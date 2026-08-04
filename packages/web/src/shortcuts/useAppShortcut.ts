import {
  type ConflictBehavior,
  type RegisterableHotkey,
  useHotkey,
} from "@tanstack/react-hotkeys";

export interface UseAppShortcutOptions {
  enabled?: boolean;
  ignoreInputs?: boolean;
  blurOnTrigger?: boolean;
  eventType?: "keydown" | "keyup";
  preventDefault?: boolean;
  stopPropagation?: boolean;
  /**
   * When true, the handler still runs while `document.body.dataset.appLocked`
   * is set. Use for the keys that open/close those locks (Mod+K, Shift+?,
   * Escape) so overlays remain dismissible from the keyboard.
   */
  ignoreAppLock?: boolean;
  /** @default 'allow' — multiple features often register the same global key (e.g. Escape). */
  conflictBehavior?: ConflictBehavior;
}

export function useAppShortcut(
  hotkey: RegisterableHotkey,
  handler: (event: KeyboardEvent) => void,
  options: UseAppShortcutOptions = {},
) {
  const {
    enabled = true,
    ignoreInputs,
    blurOnTrigger = false,
    eventType = "keydown",
    preventDefault,
    stopPropagation,
    ignoreAppLock = false,
    conflictBehavior = "allow",
  } = options;

  // Omit undefined option keys so TanStack's setOptions cannot clobber
  // registration defaults (e.g. Mod shortcuts resolve ignoreInputs: false).
  useHotkey(
    hotkey,
    (event) => {
      if (!ignoreAppLock && document.body.dataset.appLocked === "true") {
        return;
      }

      if (blurOnTrigger) {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }

      handler(event);
    },
    {
      enabled,
      eventType,
      conflictBehavior,
      ...(ignoreInputs !== undefined ? { ignoreInputs } : {}),
      ...(preventDefault !== undefined ? { preventDefault } : {}),
      ...(stopPropagation !== undefined ? { stopPropagation } : {}),
    },
  );
}

export const useAppShortcutUp = (
  hotkey: RegisterableHotkey,
  handler: (event: KeyboardEvent) => void,
  options?: Omit<UseAppShortcutOptions, "eventType">,
) => useAppShortcut(hotkey, handler, { ...options, eventType: "keyup" });
