import {
  type QueryClient,
  queryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { type BillingStatusResponse } from "@core/types/billing.types";
import { AppConfigApi } from "@web/api/app-config.api";
import { BillingApi } from "@web/api/billing.api";
import { track } from "@web/auth/posthog/track";
import { checkoutCelebrationActions } from "@web/billing/checkout-celebration.store";
import { BILLING_CHECKOUT_CANCELED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { settingsActions } from "@web/settings/settings.store";

export const billingQueryKeys = {
  status: ["billing", "status"] as const,
  config: ["app-config"] as const,
};

export function billingStatusQueryOptions() {
  return queryOptions({
    queryKey: billingQueryKeys.status,
    queryFn: (): Promise<BillingStatusResponse> => BillingApi.getStatus(),
    staleTime: 30_000,
  });
}

export function appConfigQueryOptions() {
  return queryOptions({
    queryKey: billingQueryKeys.config,
    queryFn: () => AppConfigApi.get(),
    staleTime: 60_000,
  });
}

export function useBillingStatusQuery(enabled: boolean) {
  return useQuery({
    ...billingStatusQueryOptions(),
    enabled,
    // Portal upgrades happen in another tab; always refetch when Compass
    // becomes visible again rather than waiting out staleTime.
    refetchOnWindowFocus: "always",
  });
}

export function useAppConfigQuery() {
  return useQuery(appConfigQueryOptions());
}

/**
 * The operator pause switch. False (paused) whenever config is pending or
 * errored, not just when the server says so, so a slow network never flashes
 * a gate before the real value loads.
 */
export function isBillingEnforced(
  config: { billing: { enforcement: boolean } } | undefined,
): boolean {
  return config?.billing.enforcement === true;
}

const STATUS_POLL_MS = 1500;
const STATUS_POLL_WINDOW_MS = 15_000;

function startBillingStatusPoll(
  queryClient: QueryClient,
  onWindowEnd: () => void,
): () => void {
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: billingQueryKeys.status });
  };
  invalidate();
  const interval = window.setInterval(invalidate, STATUS_POLL_MS);
  const timeout = window.setTimeout(() => {
    window.clearInterval(interval);
    onWindowEnd();
  }, STATUS_POLL_WINDOW_MS);
  return () => {
    window.clearInterval(interval);
    window.clearTimeout(timeout);
  };
}

/**
 * After Stripe Checkout returns `?checkout=success`, raise the celebration and
 * keep refetching billing status for a short window so a late webhook does not
 * leave the gate up. The polling is also what lets the celebration's copy
 * sharpen from "setting up" to the real status while it is on screen.
 *
 * `?checkout=cancel` is stripped with a quiet toast. `?settings=billing` is
 * the portal return: reopen Settings on Billing and poll until status lands.
 */
export function useCheckoutReturn() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { checkout, settings } = useSearch({ from: "__root__" });

  useEffect(() => {
    const stripCheckout = () => {
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, checkout: undefined }),
        replace: true,
      });
    };

    if (checkout === "cancel") {
      showStatusToast(BILLING_CHECKOUT_CANCELED_TOAST_ID, "Checkout canceled");
      stripCheckout();
      return;
    }

    if (checkout !== "success") return;

    track("trial_converted");
    checkoutCelebrationActions.celebrate();
    return startBillingStatusPoll(queryClient, stripCheckout);
  }, [checkout, navigate, queryClient]);

  useEffect(() => {
    if (settings !== "billing") return;

    settingsActions.openSettings("billing");
    return startBillingStatusPoll(queryClient, () => {
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, settings: undefined }),
        replace: true,
      });
    });
  }, [navigate, queryClient, settings]);
}
