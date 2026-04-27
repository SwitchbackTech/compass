import { useEffect } from "react";
import { useBufferedVisibility } from "@web/common/hooks/useBufferedVisibility";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { selectIsAuthenticating } from "@web/ducks/auth/selectors/auth.selectors";
import { useAppSelector } from "@web/store/store.hooks";

export const SyncEventsOverlay = () => {
  const isAuthenticating = useAppSelector(selectIsAuthenticating);

  // Only block the app during OAuth popup phase
  // Calendar import happens in background with sidebar spinner
  const isActive = useBufferedVisibility(isAuthenticating);

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
      title="Complete Google sign-in..."
      message="Please complete authorization in the popup window"
      role="status"
      variant="status"
    />
  );
};
