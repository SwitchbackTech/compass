import { useEffect, useState } from "react";
import { isEditableFocusTarget } from "@web/common/utils/form/form.util";

/**
 * True while focus sits in a field where bare-letter shortcuts stand down
 * (text inputs, textarea, select, contenteditable).
 */
export function useIsEditableFocused(): boolean {
  const [editableFocused, setEditableFocused] = useState(() =>
    isEditableFocusTarget(document.activeElement),
  );

  useEffect(() => {
    const sync = () => {
      setEditableFocused(isEditableFocusTarget(document.activeElement));
    };

    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sync);
    sync();

    return () => {
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sync);
    };
  }, []);

  return editableFocused;
}
