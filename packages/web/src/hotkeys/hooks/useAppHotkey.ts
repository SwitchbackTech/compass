import {
  type ConflictBehavior,
  type Hotkey,
  type HotkeySequence,
  type RegisterableHotkey,
  useHotkey,
  useHotkeySequence,
} from "@tanstack/react-hotkeys";

export interface UseAppHotkeyOptions {
  enabled?: boolean;
  ignoreInputs?: boolean;
  blurOnTrigger?: boolean;
  eventType?: "keydown" | "keyup";
  /** @default 'allow' — multiple features often register the same global key (e.g. Escape). */
  conflictBehavior?: ConflictBehavior;
}

export function useAppHotkey(
  hotkey: RegisterableHotkey,
  handler: (event: KeyboardEvent) => void,
  options: UseAppHotkeyOptions = {},
) {
  const {
    enabled = true,
    ignoreInputs,
    blurOnTrigger = false,
    eventType = "keydown",
    conflictBehavior = "allow",
  } = options;

  useHotkey(
    hotkey,
    (event) => {
      if (document.body.dataset.appLocked === "true") {
        return;
      }

      if (blurOnTrigger) {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }

      handler(event);
    },
    {
      enabled,
      ignoreInputs,
      eventType,
      conflictBehavior,
    },
  );
}

export const useAppHotkeyUp = (
  hotkey: RegisterableHotkey,
  handler: (event: KeyboardEvent) => void,
  options?: Omit<UseAppHotkeyOptions, "eventType">,
) => useAppHotkey(hotkey, handler, { ...options, eventType: "keyup" });

/**
 * Sequence variant of {@link useAppHotkey} for multi-key chords (e.g. ["E", "D"]).
 * Always fires on keyup. Respects the appLocked guard like all other app hotkeys.
 */
export function useAppHotkeySequence(
  sequence: readonly Hotkey[],
  handler: (event: KeyboardEvent) => void,
  options: Omit<UseAppHotkeyOptions, "eventType"> = {},
) {
  const {
    enabled = true,
    ignoreInputs,
    blurOnTrigger = false,
    conflictBehavior = "allow",
  } = options;

  useHotkeySequence(
    sequence as HotkeySequence,
    (event) => {
      if (document.body.dataset.appLocked === "true") {
        return;
      }

      if (blurOnTrigger) {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }

      handler(event);
    },
    {
      enabled,
      ignoreInputs,
      eventType: "keyup",
      conflictBehavior,
    },
  );
}
