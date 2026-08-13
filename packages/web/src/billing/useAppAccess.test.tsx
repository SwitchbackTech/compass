import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { type PropsWithChildren } from "react";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { SessionContext } from "@web/auth/compass/session/session.context";
import * as authStateUtil from "@web/auth/compass/state/auth.state.util";
import { billingQueryKeys } from "@web/billing/billing.query";
import { useAppAccess } from "@web/billing/useAppAccess";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const createWrapper = (authenticated = false, client?: QueryClient) => {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  return ({ children }: PropsWithChildren) => (
    <SessionContext.Provider
      value={{ authenticated, setAuthenticated: () => {} }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionContext.Provider>
  );
};

const stubConfig = (isConfigured: boolean) => {
  server.use(
    rest.get(`${ENV_WEB.API_BASEURL}/config`, (_req, res, ctx) =>
      res(
        ctx.json({
          google: { isConfigured: false },
          billing: {
            isConfigured,
            priceDisplay: "$7.99/month",
            trialLengthDays: 7,
          },
        }),
      ),
    ),
  );
};

const stubBilling = (body: {
  subscriptionStatus: string;
  trialEndsAt: string | null;
  isReadOnly: boolean;
}) => {
  server.use(
    rest.get(`${ENV_WEB.API_BASEURL}/billing/status`, (_req, res, ctx) =>
      res(ctx.json(body)),
    ),
  );
};

describe("useAppAccess", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses the anonymous trial for a fresh visitor", async () => {
    stubConfig(true);
    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.kind).toBe("anonymous-trial");
    });
    if (result.current.kind !== "anonymous-trial") {
      throw new Error("unreachable");
    }
    expect(result.current.isExpired).toBe(false);
    expect(result.current.daysLeft).toBe(7);
  });

  it("expires the anonymous trial after the window", async () => {
    persistentBrowserStore.set(STORAGE_KEYS.TRIAL_STARTED_AT, daysAgo(8));
    stubConfig(true);
    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        kind: "anonymous-trial",
        isExpired: true,
      });
    });
  });

  it("fails open while authenticated billing status is loading", () => {
    stubConfig(true);
    server.use(
      rest.get(`${ENV_WEB.API_BASEURL}/billing/status`, (_req, res, ctx) =>
        res(
          ctx.delay(500),
          ctx.json({
            subscriptionStatus: "active",
            trialEndsAt: null,
            isReadOnly: false,
          }),
        ),
      ),
    );

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(true),
    });
    expect(result.current).toEqual({ kind: "open" });
  });

  it("fails open when billing status fetch fails", async () => {
    stubConfig(true);
    server.use(
      rest.get(`${ENV_WEB.API_BASEURL}/billing/status`, (_req, res, ctx) =>
        res(ctx.status(500)),
      ),
    );

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(true),
    });
    await waitFor(() => {
      expect(result.current).toEqual({ kind: "open" });
    });
  });

  it("fails open when Stripe is unconfigured", async () => {
    stubConfig(false);

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(true),
    });
    await waitFor(() => {
      expect(result.current).toEqual({ kind: "open" });
    });
  });

  it("returns server active status", async () => {
    stubConfig(true);
    stubBilling({
      subscriptionStatus: "active",
      trialEndsAt: null,
      isReadOnly: false,
    });

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(true),
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        kind: "server",
        status: "active",
        isReadOnly: false,
        trialEndsAt: null,
      });
    });
  });

  it("returns server awaiting_checkout as read-only", async () => {
    stubConfig(true);
    stubBilling({
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: null,
      isReadOnly: true,
    });

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(true),
    });
    await waitFor(() => {
      expect(result.current).toMatchObject({
        kind: "server",
        status: "awaiting_checkout",
        isReadOnly: true,
      });
    });
  });

  it("does not fetch billing status after sign-out when hasAuthenticated is still set", () => {
    const hasUserEverAuthenticatedSpy = spyOn(
      authStateUtil,
      "hasUserEverAuthenticated",
    ).mockReturnValue(true);
    stubConfig(true);
    let billingHits = 0;
    server.use(
      rest.get(`${ENV_WEB.API_BASEURL}/billing/status`, (_req, res, ctx) => {
        billingHits += 1;
        return res(ctx.status(401));
      }),
    );

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(false),
    });
    expect(result.current).toEqual({ kind: "open" });
    expect(billingHits).toBe(0);
    hasUserEverAuthenticatedSpy.mockRestore();
  });

  it("does not keep a cached read-only billing gate after the session is gone", () => {
    const hasUserEverAuthenticatedSpy = spyOn(
      authStateUtil,
      "hasUserEverAuthenticated",
    ).mockReturnValue(true);
    stubConfig(true);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(billingQueryKeys.status, {
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: null,
      isReadOnly: true,
    });
    let billingHits = 0;
    server.use(
      rest.get(`${ENV_WEB.API_BASEURL}/billing/status`, (_req, res, ctx) => {
        billingHits += 1;
        return res(ctx.status(401));
      }),
    );

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(false, client),
    });
    expect(result.current).toEqual({ kind: "open" });
    expect(billingHits).toBe(0);
    hasUserEverAuthenticatedSpy.mockRestore();
  });
});
