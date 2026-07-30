import { createElement } from "react";
import { type Id } from "react-toastify";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { getToast } from "@web/common/utils/toast/toast.port";
import { VIEW_TO_PARAM } from "@web/components/AuthModal/hooks/useAuthModal";

const ANONYMOUS_SAVE_TOAST_ID: Id = "anonymous-save-toast";

function hasSeenAnonymousSaveToast(): boolean {
  if (!persistentBrowserStore.isAvailable()) return true;
  return (
    persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_ANONYMOUS_SAVE_TOAST) ===
    "true"
  );
}

function markAnonymousSaveToastSeen(): void {
  persistentBrowserStore.set(
    STORAGE_KEYS.HAS_SEEN_ANONYMOUS_SAVE_TOAST,
    "true",
  );
}

interface AnonymousSaveToastProps {
  toastId: Id;
}

async function openSignUpFromOutsideRouter(): Promise<void> {
  const { router } = await import("@web/routers");
  router.navigate({
    to: ".",
    search: (prev: Record<string, unknown>) => ({
      ...prev,
      auth: VIEW_TO_PARAM.signUp,
    }),
  });
}

const AnonymousSaveToast = ({ toastId }: AnonymousSaveToastProps) => {
  const handleSignUp = () => {
    void openSignUpFromOutsideRouter();
    getToast().dismiss(toastId);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-text">
        Sign up to save your calendar across devices.
      </p>
      <button
        className="w-full rounded bg-accent-secondary px-3 py-2 font-medium text-on-accent text-sm transition-colors hover:bg-accent-secondary-hover"
        onClick={handleSignUp}
        type="button"
      >
        Sign up
      </button>
    </div>
  );
};

export function maybeShowAnonymousSaveToast(): void {
  if (hasSeenAnonymousSaveToast()) return;

  markAnonymousSaveToastSeen();
  showStatusToast(
    ANONYMOUS_SAVE_TOAST_ID,
    createElement(AnonymousSaveToast, { toastId: ANONYMOUS_SAVE_TOAST_ID }),
  );
}
