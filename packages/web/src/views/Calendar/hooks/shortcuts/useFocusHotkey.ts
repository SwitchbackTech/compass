import { useHotkeys } from "@tanstack/react-hotkeys";

export const useReminderHotkey = (
  callback: () => void,
  dependencies: unknown[] = [],
  enabled = true,
) =>
  useHotkeys(
    "r",
    (event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      callback();
    },
    { enabled },
    dependencies,
  );
