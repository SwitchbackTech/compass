import { useHotkeys } from "react-hotkeys-hook";

export const useReminderHotkey = (
  callback: () => void,
  dependencies: unknown[] = [],
) =>
  useHotkeys(
    "R",
    callback,
    { description: "reminder", preventDefault: true },
    dependencies,
  );
