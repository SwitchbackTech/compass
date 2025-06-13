import { useHotkeys } from "react-hotkeys-hook";

export const useFocusHotkey = (
  callback: () => void,
  dependencies: unknown[] = [],
) =>
  useHotkeys(
    "F",
    callback,
    { description: "focus", preventDefault: true },
    dependencies,
  );
