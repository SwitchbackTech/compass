import { Id, toast } from "react-toastify";

interface SessionExpiredToastProps {
  onReconnect: () => void;
  toastId: Id;
}

export const SessionExpiredToast = ({
  onReconnect,
  toastId,
}: SessionExpiredToastProps) => {
  const handleReconnect = () => {
    onReconnect();
    toast.dismiss(toastId);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-white">
        Session expired. Please log in again to reconnect Google Calendar.
      </p>
      <button
        className="bg-bg-secondary text-text-lighter hover:bg-accent-primary hover:text-text-dark w-full rounded px-3 py-2 text-sm font-medium transition-colors"
        onClick={handleReconnect}
        type="button"
      >
        Reconnect Google Calendar
      </button>
    </div>
  );
};
