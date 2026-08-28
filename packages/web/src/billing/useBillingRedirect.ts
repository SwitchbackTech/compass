import { useState } from "react";
import { BillingApi } from "@web/api/billing.api";
import {
  getApiErrorMessage,
  isSessionLevelError,
} from "@web/api/util/api.util";
import { track } from "@web/auth/posthog/track";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";

type BillingRedirectKind = "checkout" | "portal";

const fallbackMessage = (kind: BillingRedirectKind): string =>
  kind === "portal"
    ? "Couldn't open billing. Please try again."
    : "Couldn't start checkout. Please try again.";

/**
 * Checkout stays same-tab so `?checkout=success` can raise the celebration.
 * Portal opens in a new tab so Settings (or the gate) is still there when
 * the user comes back; a blocked popup falls back to same-tab assign, whose
 * `return_url` reopens Settings on Billing.
 *
 * The blank popup is opened before the await so the click/key gesture still
 * counts as a user activation for popup blockers.
 */
const navigateToBillingUrl = (
  kind: BillingRedirectKind,
  url: string,
  popup: Window | null,
): void => {
  if (kind === "checkout") {
    window.location.assign(url);
    return;
  }
  if (popup && !popup.closed) {
    popup.opener = null;
    popup.location.replace(url);
    return;
  }
  popup?.close();
  window.location.assign(url);
};

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
    const popup =
      kind === "portal" ? window.open("about:blank", "_blank") : null;
    try {
      const { url } =
        kind === "checkout"
          ? await BillingApi.createCheckoutSession()
          : await BillingApi.createPortalSession();
      navigateToBillingUrl(kind, url, popup);
    } catch (error) {
      popup?.close();
      if (!isSessionLevelError(error)) {
        const fromApi = getApiErrorMessage(error);
        showErrorToast(
          fromApi && fromApi !== "Internal server error"
            ? fromApi
            : fallbackMessage(kind),
        );
      }
    } finally {
      setIsRedirecting(false);
    }
  };

  return { isRedirecting, redirectTo };
}
