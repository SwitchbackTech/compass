import { type DependencyList } from "react";
import { type RegisterableHotkey, useHotkey } from "@tanstack/react-hotkeys";
import { isEditable } from "@web/views/Day/util/day.shortcut.util";

interface Options {
  combination: string[];
  handler?: (e: KeyboardEvent) => void;
  listenWhileEditing?: boolean;
  /** @deprecated TanStack Hotkeys auto-syncs callbacks, so deps are no longer needed */
  deps?: DependencyList;
  eventType: "keydown" | "keyup";
}

/**
 * Normalize KeyboardEvent.key values to TanStack Hotkeys format
 */
function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    Control: "ctrl",
    Meta: "meta",
    Alt: "alt",
    Shift: "shift",
    Escape: "esc",
    Esc: "esc",
    ArrowUp: "arrowup",
    ArrowDown: "arrowdown",
    ArrowLeft: "arrowleft",
    ArrowRight: "arrowright",
    Delete: "delete",
    Backspace: "backspace",
    Enter: "enter",
  };

  return keyMap[key] ?? key.toLowerCase();
}

/**
 * useKeyboardEvent
 *
 * hook to listen to specific global DOM keyboard events key combination
 * can be called multiple times in different components
 * uses TanStack Hotkeys for efficient key handling
 */
export function useKeyboardEvent({
  combination,
  handler,
  listenWhileEditing,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deps: _deps, // Kept for API compatibility - TanStack auto-syncs callbacks
  eventType = "keyup",
}: Options) {
  // Convert combination array to TanStack hotkey format
  // Normalize keys like "Control" -> "ctrl", "ArrowRight" -> "arrowright"
  const hotkeyString = combination
    .map(normalizeKey)
    .join("+") as RegisterableHotkey;

  // TanStack Hotkeys automatically syncs callbacks on every render,
  // so no dependency array is needed - callbacks always have access to latest values
  useHotkey(
    hotkeyString,
    (event) => {
      if (!handler) return;

      // Check if app is locked
      if (document?.body?.dataset?.appLocked === "true") {
        return;
      }

      const targetElement = event.target as HTMLElement;
      const activeElement = document.activeElement as HTMLElement;
      const activeElementEditable = isEditable(activeElement);
      const eventTargetEditable = isEditable(targetElement);
      const isInsideEditable = activeElementEditable || eventTargetEditable;

      // Handle listenWhileEditing behavior
      if (listenWhileEditing && isInsideEditable) {
        if (activeElement) {
          activeElement?.blur?.();
        } else if (targetElement) {
          targetElement?.blur?.();
        }
      } else if (!listenWhileEditing && isInsideEditable) {
        return;
      }

      event.preventDefault();
      handler(event);
    },
    {
      eventType,
      enabled: true,
    },
  );
}

/**
 * useSetupKeyboardEvents
 *
 * hook to setup global key event listeners
 * TanStack Hotkeys handles this automatically, so this is now a no-op
 * kept for backward compatibility
 */
export function useSetupKeyboardEvents() {
  // TanStack Hotkeys automatically sets up event listeners
  // This function is kept for backward compatibility but does nothing
}

export function useKeyUpEvent(options: Omit<Options, "eventType">) {
  return useKeyboardEvent({ ...options, eventType: "keyup" });
}

export function useKeyDownEvent(options: Omit<Options, "eventType">) {
  return useKeyboardEvent({ ...options, eventType: "keydown" });
}
