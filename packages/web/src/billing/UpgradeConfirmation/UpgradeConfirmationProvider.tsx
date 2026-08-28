import { useQueryClient } from "@tanstack/react-query";
import { type PropsWithChildren, useCallback, useState } from "react";
import { BillingApi } from "@web/api/billing.api";
import {
  getApiErrorMessage,
  isSessionLevelError,
} from "@web/api/util/api.util";
import { track } from "@web/auth/posthog/track";
import { billingQueryKeys } from "@web/billing/billing.query";
import {
  UpgradeConfirmationContext,
  useUpgradeConfirmationState,
} from "@web/billing/UpgradeConfirmation/hooks/useUpgradeConfirmation";
import { UpgradeConfirmationDialog } from "@web/billing/UpgradeConfirmation/UpgradeConfirmationDialog";
import { useIsTrialing } from "@web/billing/useIsTrialing";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";

const SUBSCRIBED_TOAST_ID = "billing-subscribed";

export function UpgradeConfirmationProvider({ children }: PropsWithChildren) {
  const value = useUpgradeConfirmationState();
  const { closeUpgradeConfirmation, isOpen } = value;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const isTrialing = useIsTrialing();

  // Bare "B" for billing. The feature owns its own trigger rather than
  // `useNavigationShortcuts`, which must stay usable without a QueryClient.
  // Registered only while a trial runs, so the key stays free otherwise. No
  // `ignoreAppLock`: a gate or dialog already owning the screen keeps it.
  useAppShortcutUp(
    "B",
    () => {
      value.openUpgradeConfirmation();
    },
    { enabled: isTrialing },
  );

  const reportFailure = useCallback((error: unknown, fallback: string) => {
    if (isSessionLevelError(error)) return;
    const fromApi = getApiErrorMessage(error);
    showErrorToast(
      fromApi && fromApi !== "Internal server error" ? fromApi : fallback,
    );
  }, []);

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
          showStatusToast(SUBSCRIBED_TOAST_ID, "You're subscribed");
        } else {
          showErrorToast(
            "We ended your trial, but the payment didn't go through. Check your card under Manage billing.",
          );
        }
      } catch (error) {
        reportFailure(error, "Couldn't subscribe. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [closeUpgradeConfirmation, queryClient, reportFailure]);

  const handleManageBilling = useCallback(() => {
    setIsSubmitting(true);
    void (async () => {
      try {
        const { url } = await BillingApi.createPortalSession();
        window.location.assign(url);
      } catch (error) {
        reportFailure(error, "Couldn't open billing. Please try again.");
        setIsSubmitting(false);
      }
    })();
  }, [reportFailure]);

  return (
    <UpgradeConfirmationContext.Provider value={value}>
      {children}
      <UpgradeConfirmationDialog
        isOpen={isOpen}
        isSubmitting={isSubmitting}
        onCancel={closeUpgradeConfirmation}
        onConfirm={handleConfirm}
        onManageBilling={handleManageBilling}
      />
    </UpgradeConfirmationContext.Provider>
  );
}
