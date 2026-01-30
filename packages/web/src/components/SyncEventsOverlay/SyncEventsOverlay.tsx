import { useEffect } from "react";
import { useSession } from "@web/auth/hooks/useSession";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { selectImporting } from "@web/ducks/events/selectors/sync.selector";
import { useAppSelector } from "@web/store/store.hooks";

export const SyncEventsOverlay = () => {
  const { isSyncing } = useSession();
  const importing = useAppSelector(selectImporting);
  const isActive = isSyncing || importing;

  // Determine which phase we're in:
  // - isSyncing && !importing: OAuth in progress (waiting for user to complete sign-in)
  // - importing: Calendar import in progress (after OAuth succeeded)
  const isOAuthPhase = isSyncing && !importing;

  useEffect(() => {
    if (!isActive) {
      document.body.removeAttribute("data-app-locked");
      return;
    }

    document.body.setAttribute("data-app-locked", "true");
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur?.();

    return () => {
      document.body.removeAttribute("data-app-locked");
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <OverlayPanel
      icon={
        <div
          className="border-border-primary border-t-text-lighter h-10 w-10 animate-spin rounded-full border-2"
          aria-hidden="true"
        />
      }
      title={
        isOAuthPhase
          ? "Complete Google sign-in..."
          : "Importing your Google Calendar events..."
      }
      message={
        isOAuthPhase
          ? "Please complete authorization in the popup window"
          : "Please hang tight while we sync your calendar"
      }
      role="status"
      backdrop="blur"
      variant="status"
    />
  );
};
