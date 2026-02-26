import { useEffect } from "react";
import { useBufferedVisibility } from "@web/common/hooks/useBufferedVisibility";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { selectIsAuthenticating } from "@web/ducks/auth/selectors/auth.selectors";
import {
  selectAwaitingImportResults,
  selectImporting,
} from "@web/ducks/events/selectors/sync.selector";
import { useAppSelector } from "@web/store/store.hooks";

export const SyncEventsOverlay = () => {
  const importing = useAppSelector(selectImporting);
  const awaitingImportResults = useAppSelector(selectAwaitingImportResults);
  const isAuthenticating = useAppSelector(selectIsAuthenticating);

  // Show overlay when:
  // - isAuthenticating: User clicked sign-in, popup is open (from auth slice)
  // - awaitingImportResults: OAuth completed, waiting on import results
  // - importing: Calendar import in progress (from sync slice)
  const shouldBeActive = isAuthenticating || awaitingImportResults || importing;

  // Buffer visibility to prevent flash during state transitions (e.g., OAuth → import phase)
  const isActive = useBufferedVisibility(shouldBeActive);

  // Determine which phase we're in:
  // - isAuthenticating: OAuth in progress (waiting for user)
  // - importing/awaitingImportResults: Calendar import in progress (after OAuth succeeded)
  const isOAuthPhase = isAuthenticating;

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
      variant="status"
    />
  );
};
