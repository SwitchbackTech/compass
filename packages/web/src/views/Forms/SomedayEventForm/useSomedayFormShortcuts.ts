import {
  isComboboxInteraction,
  isDeleteTextEditingTarget,
} from "@web/common/utils/form/form.util";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

export const SOMEDAY_HOTKEY_OPTIONS = {
  enabled: true,
};

export interface SomedayFormShortcutsProps {
  onSubmit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const isMenuInteraction = (keyboardEvent: KeyboardEvent) => {
  const target = keyboardEvent.target as HTMLElement | null;

  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  if (target.getAttribute("role") === "menuitem") {
    return true;
  }

  return Boolean(target.closest?.("[role='menu']"));
};

export const stopPropagationWrapper =
  (callback: () => void) => (event: KeyboardEvent) => {
    if (isDeleteTextEditingTarget(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    callback();
  };

// TanStack Hotkeys automatically syncs callbacks on every render,
// so callbacks always have access to latest values (no stale closures)
export const useSomedayFormShortcuts = ({
  onSubmit,
  onDelete,
  onDuplicate,
}: SomedayFormShortcutsProps) => {
  useAppShortcut("Delete", stopPropagationWrapper(onDelete), {
    ...SOMEDAY_HOTKEY_OPTIONS,
    ignoreInputs: false,
  });

  useAppShortcut(
    "Enter",
    (keyboardEvent) => {
      if (
        isMenuInteraction(keyboardEvent) ||
        isComboboxInteraction(keyboardEvent)
      ) {
        // Don't prevent default - let the child component in focus handle the event
        return;
      }

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      onSubmit();
    },
    SOMEDAY_HOTKEY_OPTIONS,
  );

  useAppShortcut(
    "Mod+Enter",
    (keyboardEvent) => {
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      onSubmit();
    },
    SOMEDAY_HOTKEY_OPTIONS,
  );

  useAppShortcut(
    "Mod+D",
    stopPropagationWrapper(onDuplicate),
    SOMEDAY_HOTKEY_OPTIONS,
  );
};
