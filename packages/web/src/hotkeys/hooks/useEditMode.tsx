import { useContext } from "react";
import { EditModeContext } from "../providers/EditModeProvider";

export { EDIT_MODE_TIMEOUT_MS } from "../constants/hotkey.constants";
export { EditModeProvider } from "../providers/EditModeProvider";

export function useEditMode() {
  const context = useContext(EditModeContext);

  if (!context) {
    throw new Error("useShortcutEditMode must be used within EditModeProvider");
  }

  return context;
}
