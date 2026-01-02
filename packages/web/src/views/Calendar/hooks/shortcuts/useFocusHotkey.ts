import { useHotkeys } from "react-hotkeys-hook";

export const useReminderHotkey = (
  callback: () => void,
  dependencies: unknown[] = [],
  enabled = true,
) =>
  useHotkeys(
    "R",
    callback,
    { description: "reminder", preventDefault: true, enabled },
    dependencies,
  );
