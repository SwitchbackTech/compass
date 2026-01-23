import { useEffect } from "react";
import { useSession } from "@web/auth/hooks/useSession";
import { selectImporting } from "@web/ducks/events/selectors/sync.selector";
import { useAppSelector } from "@web/store/store.hooks";

export const SyncEventsOverlay = () => {
  const { isSyncing } = useSession();
  const importing = useAppSelector(selectImporting);
  const isImporting = isSyncing || importing;

  useEffect(() => {
    if (!isImporting) {
      document.body.removeAttribute("data-app-locked");
      return;
    }

    document.body.setAttribute("data-app-locked", "true");
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur?.();

    return () => {
      document.body.removeAttribute("data-app-locked");
    };
  }, [isImporting]);

  if (!isImporting) return null;

  return (
    <div
      className="bg-bg-primary/80 fixed inset-0 z-[999] flex cursor-wait items-center justify-center backdrop-blur-sm"
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
          Please hang tight while we sync your calendar
        </div>
      </div>
    </div>
  );
};
