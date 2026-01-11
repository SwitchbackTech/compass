import { useEffect } from "react";
import { useSession } from "@web/common/hooks/useSession";

export const SyncEventsOverlay = () => {
  const { isSyncing } = useSession();

  useEffect(() => {
    if (!isSyncing) {
      document.body.removeAttribute("data-app-locked");
      return;
    }

    document.body.setAttribute("data-app-locked", "true");
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur?.();

    return () => {
      document.body.removeAttribute("data-app-locked");
    };
  }, [isSyncing]);

  if (!isSyncing) return null;

  return (
    <div
      className="bg-bg-primary/80 fixed inset-0 z-50 flex cursor-wait items-center justify-center backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="border-border-primary bg-bg-secondary/90 flex max-w-sm flex-col items-center gap-3 rounded-lg border px-6 py-5 text-center shadow-lg">
        <div
          className="border-border-primary border-t-text-lighter h-10 w-10 animate-spin rounded-full border-2"
          aria-hidden="true"
        />
        <div className="text-text-lighter text-sm font-semibold">
          Importing your Google Calendar events...
        </div>
        <div className="text-text-light/80 text-xs">
          Please wait while we sync your calendar. You won't be able to create
          events until this is complete.
        </div>
      </div>
    </div>
  );
};
