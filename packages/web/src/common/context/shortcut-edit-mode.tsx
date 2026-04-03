import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const EDIT_MODE_TIMEOUT_MS = 1000;

interface ShortcutEditModeContextValue {
  isEditMode: boolean;
  armEditMode: () => void;
  clearEditMode: () => void;
}

const ShortcutEditModeContext = createContext<
  ShortcutEditModeContextValue | undefined
>(undefined);

export function ShortcutEditModeProvider({ children }: PropsWithChildren) {
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
    <ShortcutEditModeContext.Provider
      value={{ isEditMode, armEditMode, clearEditMode }}
    >
      {children}
    </ShortcutEditModeContext.Provider>
  );
}

export function useShortcutEditMode() {
  const context = useContext(ShortcutEditModeContext);

  if (!context) {
    throw new Error(
      "useShortcutEditMode must be used within ShortcutEditModeProvider",
    );
  }

  return context;
}
