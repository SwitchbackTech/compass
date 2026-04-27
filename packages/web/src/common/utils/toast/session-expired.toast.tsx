import { type Id, toast } from "react-toastify";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

interface SessionExpiredToastProps {
  toastId: Id;
}

export const SessionExpiredToast = ({ toastId }: SessionExpiredToastProps) => {
  const { openModal } = useAuthModal();

  const handleSignIn = () => {
    openModal("login");
    toast.dismiss(toastId);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-white">
        Session expired. Please sign in again.
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
