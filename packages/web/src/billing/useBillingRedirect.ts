import { useState } from "react";
import { BillingApi } from "@web/api/billing.api";
import {
  getApiErrorMessage,
  isSessionLevelError,
} from "@web/api/util/api.util";
import { track } from "@web/auth/posthog/track";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";

type BillingRedirectKind = "checkout" | "portal";

/**
 * The one way out of Compass and into Stripe. Owns the in-flight latch (a
 * double click would otherwise open two Checkout sessions) and the failure
 * toast: a bare `.then(assign)` leaves a failed session as an unhandled
 * rejection and a button that visibly does nothing.
 *
 * `cta` defaults to the kind; pass it to tell two call sites apart in the
 * funnel.
 */
export function useBillingRedirect() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const redirectTo = async (kind: BillingRedirectKind, cta: string = kind) => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    track("billing_gate_cta_clicked", { cta });
    try {
      const { url } =
        kind === "checkout"
          ? await BillingApi.createCheckoutSession()
          : await BillingApi.createPortalSession();
      window.location.assign(url);
    } catch (error) {
      if (!isSessionLevelError(error)) {
        const fromApi = getApiErrorMessage(error);
        showErrorToast(
          fromApi && fromApi !== "Internal server error"
            ? fromApi
            : "Couldn't start checkout. Please try again.",
        );
      }
    } finally {
      setIsRedirecting(false);
    }
  };

  return { isRedirecting, redirectTo };
}
