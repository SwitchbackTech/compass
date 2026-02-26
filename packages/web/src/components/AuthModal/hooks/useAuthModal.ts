import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type AuthView = "login" | "signUp" | "forgotPassword";

interface AuthModalContextValue {
  isOpen: boolean;
  currentView: AuthView;
  openModal: (view?: AuthView) => void;
  closeModal: () => void;
  setView: (view: AuthView) => void;
}

const defaultContextValue: AuthModalContextValue = {
  isOpen: false,
  currentView: "login",
  openModal: () => {},
  closeModal: () => {},
  setView: () => {},
};

export const AuthModalContext =
  createContext<AuthModalContextValue>(defaultContextValue);

/**
 * Hook to access auth modal state and controls
 *
 * Must be used within an AuthModalProvider
 */
export function useAuthModal(): AuthModalContextValue {
  return useContext(AuthModalContext);
}

/**
 * Hook to create auth modal state
 *
 * Used by AuthModalProvider to create the context value
 */
export function useAuthModalState() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AuthView>("login");

  const openModal = useCallback((view: AuthView = "login") => {
    setCurrentView(view);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Reset to signIn view after closing
    setCurrentView("login");
  }, []);

  const setView = useCallback((view: AuthView) => {
    setCurrentView(view);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      currentView,
      openModal,
      closeModal,
      setView,
    }),
    [isOpen, currentView, openModal, closeModal, setView],
  );

  return value;
}
