import { ProviderConnectChooser } from "@web/auth/providers/ProviderConnectChooser";
import { bookingConnectPromptCopy } from "@web/auth/providers/provider-copy.util";
import { useConnectableProviders } from "@web/auth/providers/useIsProviderAvailable";

export function BookingConnectGooglePrompt() {
  const connectable = useConnectableProviders();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">
        {bookingConnectPromptCopy(connectable)}
      </p>
      {connectable.length > 0 ? (
        <ProviderConnectChooser variant="prompt" />
      ) : (
        <p className="text-sm text-text-muted">
          Google sign-in is not configured in this environment.
        </p>
      )}
    </div>
  );
}
