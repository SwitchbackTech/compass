import { useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";

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
