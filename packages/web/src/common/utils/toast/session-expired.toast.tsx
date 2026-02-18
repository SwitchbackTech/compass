import { Id, toast } from "react-toastify";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";

interface SessionExpiredToastProps {
  toastId: Id;
}

export const SessionExpiredToast = ({ toastId }: SessionExpiredToastProps) => {
  const { login } = useGoogleAuth();

  const handleReconnect = () => {
    login();
    toast.dismiss(toastId);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-white">
        Google Calendar connection expired. Please reconnect.
      </p>
      <button
        className="bg-fg-primary-dark text-text-lighter w-full rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--color-fg-primary-dark)_90%,white)]"
        onClick={handleReconnect}
        type="button"
      >
        Reconnect Google Calendar
      </button>
    </div>
  );
};
