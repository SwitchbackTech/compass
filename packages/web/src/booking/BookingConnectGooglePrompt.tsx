import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";

export function BookingConnectGooglePrompt() {
  const { connect, isAvailable, isConnecting } = useConnectGoogle({
    newAccount: true,
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">
        Connect a Google account to enable your booking page. Guests book
        through a public link and Compass creates events on your calendar.
      </p>
      {isAvailable ? (
        <OverlayPanelActions align="start">
          <OverlayPanelActionButton
            aria-busy={isConnecting || undefined}
            disabled={isConnecting}
            onClick={connect}
            variant="primary"
          >
            {isConnecting ? "Opening Google…" : "Connect Google"}
          </OverlayPanelActionButton>
        </OverlayPanelActions>
      ) : (
        <p className="text-sm text-text-muted">
          Google sign-in is not configured in this environment.
        </p>
      )}
    </div>
  );
}
