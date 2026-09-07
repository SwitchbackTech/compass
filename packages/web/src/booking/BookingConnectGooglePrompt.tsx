import { ConnectProviderChooser } from "@web/auth/providers/ConnectProviderChooser";
import {
  bookingConnectPromptCopy,
  CONNECT_CALENDAR_LABEL,
} from "@web/auth/providers/provider-copy.util";
import { useAvailableConnectProviders } from "@web/auth/providers/useAvailableConnectProviders";

export function BookingConnectGooglePrompt() {
  const connectable = useAvailableConnectProviders();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">
        {bookingConnectPromptCopy(connectable)}
      </p>
      {connectable.length > 0 ? (
        <ConnectProviderChooser
          idleLabel={CONNECT_CALENDAR_LABEL.google}
          variant="prompt"
        />
      ) : (
        <p className="text-sm text-text-muted">
          Google sign-in is not configured in this environment.
        </p>
      )}
    </div>
  );
}
