import { useQueryClient } from "@tanstack/react-query";
import { type PropsWithChildren, useCallback, useState } from "react";
import { BillingApi } from "@web/api/billing.api";
import { track } from "@web/auth/posthog/track";
import { billingQueryKeys } from "@web/billing/billing.query";
import { showBillingRequestError } from "@web/billing/billing-request-error";
import {
  UpgradeConfirmationContext,
  useUpgradeConfirmationState,
} from "@web/billing/UpgradeConfirmation/hooks/useUpgradeConfirmation";
import { UpgradeConfirmationDialog } from "@web/billing/UpgradeConfirmation/UpgradeConfirmationDialog";
import { useBillingRedirect } from "@web/billing/useBillingRedirect";
import { useIsTrialing } from "@web/billing/useIsTrialing";
import { BILLING_SUBSCRIBED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import {
  selectIsSettingsOpen,
  useSettingsStore,
} from "@web/settings/settings.store";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";

export function UpgradeConfirmationProvider({ children }: PropsWithChildren) {
  const value = useUpgradeConfirmationState();
  const { closeUpgradeConfirmation, isOpen } = value;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const isTrialing = useIsTrialing();
  const isSettingsOpen = useSettingsStore(selectIsSettingsOpen);
  const { isRedirecting, redirectTo } = useBillingRedirect();
  const busy = isSubmitting || isRedirecting;
  const handleManageBilling = () => {
    if (busy) return;
    void redirectTo("portal", "upgrade_portal");
  };

  // Bare "B" for billing. The feature owns its own trigger rather than
  // `useNavigationShortcuts`, which must stay usable without a QueryClient.
  // Registered only while a trial runs, so the key stays free otherwise.
  // `ignoreAppLock` while Settings is open: that modal is exactly where
  // "Press B to subscribe" is written, and OverlayPanel would otherwise
  // swallow the key.
  useAppShortcutUp(
    "B",
    () => {
      value.openUpgradeConfirmation();
    },
    { enabled: isTrialing, ignoreAppLock: isSettingsOpen },
  );

  const handleConfirm = useCallback(() => {
    setIsSubmitting(true);
    void (async () => {
      try {
        const status = await BillingApi.endTrial();
        await queryClient.invalidateQueries({
          queryKey: billingQueryKeys.status,
        });
        closeUpgradeConfirmation();

        // Report what actually happened. A declined card lands on past_due,
        // which still writes but needs the user's attention, so it must not
        // be dressed up as a successful upgrade.
        if (status.subscriptionStatus === "active") {
          track("trial_converted");
          showStatusToast(BILLING_SUBSCRIBED_TOAST_ID, "You're subscribed");
        } else {
          showErrorToast(
            "We ended your trial, but the payment didn't go through. Check your card under Manage billing.",
          );
        }
      } catch (error) {
        showBillingRequestError(error, "Couldn't subscribe. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [closeUpgradeConfirmation, queryClient]);

  return (
    <UpgradeConfirmationContext.Provider value={value}>
      {children}
      <UpgradeConfirmationDialog
        isOpen={isOpen}
        isSubmitting={busy}
        isOpeningPortal={isRedirecting}
        onCancel={closeUpgradeConfirmation}
        onConfirm={handleConfirm}
        onManageBilling={handleManageBilling}
      />
    </UpgradeConfirmationContext.Provider>
  );
}
