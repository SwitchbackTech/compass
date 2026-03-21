import { useHotkey } from "@tanstack/react-hotkeys";

export const useReminderHotkey = (
  callback: () => void,
  _dependencies: unknown[] = [],
  enabled = true,
) =>
  // TanStack Hotkeys automatically syncs callbacks on every render,
  // so callbacks always have access to latest values (no stale closures)
  useHotkey(
    "r",
    (event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      callback();
    },
    { enabled },
  );
