import { useHotkeys } from "react-hotkeys-hook";
import { OptionsOrDependencyArray } from "react-hotkeys-hook/dist/types";
import {
  Categories_Event,
  Direction_Migrate,
  Schema_Event,
} from "@core/types/event.types";
import { isComboboxInteraction } from "@web/common/utils/form/form.util";

export const SOMEDAY_HOTKEY_OPTIONS: OptionsOrDependencyArray = {
  enableOnFormTags: ["input"],
  enableOnContentEditable: true,
  enabled: true,
  eventListenerOptions: { capture: true },
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

  if (!target) {
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
  useHotkeys(
    "delete",
    stopPropagationWrapper(onDelete),
    SOMEDAY_HOTKEY_OPTIONS,
    [onDelete],
  );
  useHotkeys(
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
  useHotkeys(
    "mod+enter",
    (keyboardEvent) => {
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      onSubmit();
    },
    SOMEDAY_HOTKEY_OPTIONS,
    [onSubmit],
  );

  useHotkeys(
    "meta+d",
    stopPropagationWrapper(onDuplicate),
    SOMEDAY_HOTKEY_OPTIONS,
    [onDuplicate],
  );

  useHotkeys(
    "ctrl+meta+up",
    handleMigration("up", { event, category, onMigrate }),
    SOMEDAY_HOTKEY_OPTIONS,
    [event, category, onMigrate],
  );

  useHotkeys(
    "ctrl+meta+down",
    handleMigration("down", { event, category, onMigrate }),
    SOMEDAY_HOTKEY_OPTIONS,
    [event, category, onMigrate],
  );

  useHotkeys(
    "ctrl+meta+right",
    handleMigration("forward", { event, category, onMigrate }),
    SOMEDAY_HOTKEY_OPTIONS,
    [event, category, onMigrate],
  );

  useHotkeys(
    "ctrl+meta+left",
    handleMigration("back", { event, category, onMigrate }),
    SOMEDAY_HOTKEY_OPTIONS,
    [event, category, onMigrate],
  );
};
