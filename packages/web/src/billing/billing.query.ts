import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { type BillingStatusResponse } from "@core/types/billing.types";
import { AppConfigApi } from "@web/api/app-config.api";
import { BillingApi } from "@web/api/billing.api";
import { track } from "@web/auth/posthog/track";
import { checkoutCelebrationActions } from "@web/billing/checkout-celebration.store";

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

/**
 * After Stripe Checkout returns `?checkout=success`, raise the celebration and
 * keep refetching billing status for a short window so a late webhook does not
 * leave the gate up. The polling is also what lets the celebration's copy
 * sharpen from "setting up" to the real status while it is on screen.
 */
export function useCheckoutReturn() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { checkout } = useSearch({ from: "__root__" });

  useEffect(() => {
    if (checkout !== "success") return;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.status });
    };
    invalidate();
    track("trial_converted");
    checkoutCelebrationActions.celebrate();
    const interval = window.setInterval(invalidate, 1500);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, checkout: undefined }),
        replace: true,
      });
    }, 15_000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [checkout, navigate, queryClient]);
}
