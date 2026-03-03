import { useHotkeys } from "@tanstack/react-hotkeys";

export const useReminderHotkey = (
  callback: () => void,
  dependencies: unknown[] = [],
  enabled = true,
) => useHotkeys("r", callback, { enabled }, dependencies);
