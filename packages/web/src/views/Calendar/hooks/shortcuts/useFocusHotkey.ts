import { useAppHotkeyUp } from "@web/hotkeys/hooks/useAppHotkey";

export const useReminderHotkey = (
  callback: () => void,
  _dependencies: unknown[] = [],
  enabled = true,
) =>
  useAppHotkeyUp(
    "R",
    () => {
      callback();
    },
    { enabled },
  );
