import { createContext, useCallback, useEffect, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { EDIT_MODE_TIMEOUT_MS } from "../constants/hotkey.constants";

type EditModeContextValue = {
  isEditMode: boolean;
  armEditMode: () => void;
  clearEditMode: () => void;
};

export const EditModeContext = createContext<EditModeContextValue>({
  isEditMode: false,
  armEditMode: () => {},
  clearEditMode: () => {},
});

export function EditModeProvider({ children }: PropsWithChildren) {
  const timeoutRef = useRef<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const clearEditMode = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsEditMode(false);
  }, []);

  const armEditMode = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    setIsEditMode(true);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setIsEditMode(false);
    }, EDIT_MODE_TIMEOUT_MS);
  }, []);

  useEffect(() => clearEditMode, [clearEditMode]);

  return (
    <EditModeContext.Provider
      value={{ isEditMode, armEditMode, clearEditMode }}
    >
      {children}
    </EditModeContext.Provider>
  );
}
