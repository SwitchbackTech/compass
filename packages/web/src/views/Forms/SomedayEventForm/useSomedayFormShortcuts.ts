import { useHotkey } from "@tanstack/react-hotkeys";
import {
  type Categories_Event,
  type Direction_Migrate,
  type Schema_Event,
} from "@core/types/event.types";
import { isComboboxInteraction } from "@web/common/utils/form/form.util";

export const SOMEDAY_HOTKEY_OPTIONS = {
  enabled: true,
};

export interface SomedayFormShortcutsProps {
  event: Schema_Event;
  category: Categories_Event;
  onSubmit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMigrate?: (
    event: Schema_Event,
    category: Categories_Event,
    direction: Direction_Migrate,
  ) => void;
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

export const handleMigration =
  (
    direction: Direction_Migrate,
    {
      event,
      category,
      onMigrate,
    }: Pick<SomedayFormShortcutsProps, "event" | "category" | "onMigrate">,
  ) =>
  (keyboardEvent: KeyboardEvent) => {
    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    onMigrate?.(event, category, direction);
  };

export const stopPropagationWrapper =
  (callback: () => void) => (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    callback();
  };

export const useSomedayFormShortcuts = ({
  event,
  category,
  onSubmit,
  onDelete,
  onDuplicate,
  onMigrate,
}: SomedayFormShortcutsProps) => {
  useHotkey(
    "delete",
    stopPropagationWrapper(onDelete),
    { ...SOMEDAY_HOTKEY_OPTIONS, ignoreInputs: false },
    [onDelete],
  );
  useHotkey(
    "enter",
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
    [onSubmit],
  );
  useHotkey(
    "mod+enter",
    (keyboardEvent) => {
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      onSubmit();
    },
    SOMEDAY_HOTKEY_OPTIONS,
    [onSubmit],
  );

  useHotkey(
    "meta+d",
    stopPropagationWrapper(onDuplicate),
    SOMEDAY_HOTKEY_OPTIONS,
    [onDuplicate],
  );

  useHotkey(
    "mod+arrowup",
    handleMigration("up", { event, category, onMigrate }),
    SOMEDAY_HOTKEY_OPTIONS,
    [event, category, onMigrate],
  );

  useHotkey(
    "mod+arrowdown",
    handleMigration("down", { event, category, onMigrate }),
    SOMEDAY_HOTKEY_OPTIONS,
    [event, category, onMigrate],
  );

  useHotkey(
    "mod+arrowright",
    handleMigration("forward", { event, category, onMigrate }),
    SOMEDAY_HOTKEY_OPTIONS,
    [event, category, onMigrate],
  );

  useHotkey(
    "mod+arrowleft",
    handleMigration("back", { event, category, onMigrate }),
    SOMEDAY_HOTKEY_OPTIONS,
    [event, category, onMigrate],
  );
};
