import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

export type AuthView =
  | "login"
  | "loginAfterReset"
  | "signUp"
  | "forgotPassword"
  | "resetPassword";

/**
 * The `?auth=` URL param is the single source of truth for the auth modal:
 * param present = modal open on that view, param absent = modal closed.
 * Opening pushes a history entry, so the browser back button closes the
 * modal; view switches and closing replace the entry, so one back press
 * always exits.
 */
const VIEW_TO_PARAM: Record<AuthView, string> = {
  login: "login",
  loginAfterReset: "login-after-reset",
  signUp: "signup",
  forgotPassword: "forgot",
  resetPassword: "reset",
};

const PARAM_TO_VIEW = Object.fromEntries(
  Object.entries(VIEW_TO_PARAM).map(([view, param]) => [param, view]),
) as Record<string, AuthView>;

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

const urlListeners = new Set<() => void>();

function subscribeToUrl(listener: () => void): () => void {
  urlListeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    urlListeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function getViewFromUrl(): AuthView | null {
  const param = new URLSearchParams(window.location.search).get("auth");
  return param ? (PARAM_TO_VIEW[param.toLowerCase()] ?? null) : null;
}

function setAuthUrlParam(view: AuthView | null): void {
  const url = new URL(window.location.href);
  if (view === null) {
    url.searchParams.delete("auth");
  } else {
    url.searchParams.set("auth", VIEW_TO_PARAM[view]);
  }
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;

  // Only opening from a closed state pushes an entry; view switches and
  // closing replace it, so the modal occupies at most one history entry.
  const method =
    view !== null && getViewFromUrl() === null ? "pushState" : "replaceState";
  window.history[method](window.history.state, "", nextUrl);
  for (const listener of urlListeners) {
    listener();
  }
}

/**
 * Hook to create auth modal state
 *
 * Used by AuthModalProvider to create the context value
 */
export function useAuthModalState(): AuthModalContextValue {
  const view = useSyncExternalStore(subscribeToUrl, getViewFromUrl);

  return useMemo(
    () => ({
      isOpen: view !== null,
      currentView: view ?? "login",
      openModal: (nextView: AuthView = "login") => setAuthUrlParam(nextView),
      closeModal: () => setAuthUrlParam(null),
      setView: (nextView: AuthView) => setAuthUrlParam(nextView),
    }),
    [view],
  );
}
