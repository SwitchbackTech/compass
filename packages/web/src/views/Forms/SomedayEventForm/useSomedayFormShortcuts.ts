import { useHotkeys } from "react-hotkeys-hook";
import { OptionsOrDependencyArray } from "react-hotkeys-hook/dist/types";
import {
  Categories_Event,
  Direction_Migrate,
  Schema_Event,
} from "@core/types/event.types";

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
  useHotkeys("delete", onDelete, SOMEDAY_HOTKEY_OPTIONS, [onDelete]);
  useHotkeys("enter", onSubmit, SOMEDAY_HOTKEY_OPTIONS, [onSubmit]);
  useHotkeys(
    "meta+enter",
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
