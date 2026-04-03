import { useEffect, useSyncExternalStore } from "react";
import {
  type ConflictBehavior,
  type Hotkey,
  type RegisterableHotkey,
  useHotkey,
} from "@tanstack/react-hotkeys";
import { HOTKEY_SEQUENCE_TIMEOUT_MS } from "../constants/hotkey.constants";
import { hotkeySequenceController } from "../controllers/hotkey.sequence.controller";

export interface UseAppHotkeyOptions {
  enabled?: boolean;
  ignoreInputs?: boolean;
  blurOnTrigger?: boolean;
  eventType?: "keydown" | "keyup";
  /** @default 'allow' — multiple features often register the same global key (e.g. Escape). */
  conflictBehavior?: ConflictBehavior;
}

function getSuppressionHotkey(hotkey: RegisterableHotkey): string | null {
  if (typeof hotkey !== "string") {
    return null;
  }

  if (hotkey.includes("+") || hotkey.includes(",") || hotkey.includes(" ")) {
    return null;
  }

  return hotkey.toUpperCase();
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
  const suppressionHotkey = getSuppressionHotkey(hotkey);

  useHotkey(
    hotkey,
    (event) => {
      if (document.body.dataset.appLocked === "true") {
        return;
      }

      if (
        hotkeySequenceController.shouldSuppressHotkey(event, suppressionHotkey)
      ) {
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
  const serializedSequence = JSON.stringify(sequence);

  useEffect(() => {
    const registrationId = hotkeySequenceController.register({
      blurOnTrigger,
      conflictBehavior,
      enabled,
      handler,
      ignoreInputs,
      sequence: JSON.parse(serializedSequence) as string[],
    });

    return () => {
      hotkeySequenceController.unregister(registrationId);
    };
  }, [
    blurOnTrigger,
    conflictBehavior,
    enabled,
    handler,
    ignoreInputs,
    serializedSequence,
  ]);
}

export function useIsHotkeySequencePending(sequence: readonly Hotkey[]) {
  useSyncExternalStore(
    (listener) => hotkeySequenceController.subscribe(listener),
    () => hotkeySequenceController.getSnapshotVersion(),
    () => 0,
  );

  return hotkeySequenceController.isPendingForSequence(sequence);
}

export { HOTKEY_SEQUENCE_TIMEOUT_MS };

export function resetHotkeySequenceControllerForTests() {
  hotkeySequenceController.resetForTests();
}
