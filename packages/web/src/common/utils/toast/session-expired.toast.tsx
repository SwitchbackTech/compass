import { type Id, toast } from "react-toastify";
import {
  type AuthView,
  VIEW_TO_PARAM,
} from "@web/components/AuthModal/hooks/useAuthModal";

interface SessionExpiredToastProps {
  toastId: Id;
}

// Renders outside the router (inside ToastContainer, a sibling of
// RouterProvider), so it can't call useAuthModal's router hooks. Navigate
// through the production router singleton instead - an imperative call has
// no context-binding-order problem the way a hook would. Imported
// dynamically to avoid a module cycle: this file sits on the API error path
// (api.util -> error-toast.util -> here), and the router's root route
// renders AuthModal, which pulls that same API/error-toast chain back in.
async function openAuthModalFromOutsideRouter(
  view: AuthView = "login",
): Promise<void> {
  const { router } = await import("@web/routers");
  router.navigate({
    to: ".",
    search: (prev: Record<string, unknown>) => ({
      ...prev,
      auth: VIEW_TO_PARAM[view],
    }),
  });
}

export const SessionExpiredToast = ({ toastId }: SessionExpiredToastProps) => {
  const handleSignIn = () => {
    void openAuthModalFromOutsideRouter("login");
    toast.dismiss(toastId);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-text-lighter">
        You've been signed out. Please sign in again.
      </p>
      <button
        className="w-full rounded bg-fg-primary-dark px-3 py-2 font-medium text-sm text-text-lighter transition-colors hover:bg-[color-mix(in_srgb,var(--color-fg-primary-dark)_90%,white)]"
        onClick={handleSignIn}
        type="button"
      >
        Sign in
      </button>
    </div>
  );
};
