import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { type PropsWithChildren } from "react";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import * as authStateUtil from "@web/auth/compass/state/auth.state.util";
import { useAppAccess } from "@web/billing/useAppAccess";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
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
            priceDisplay: "$8/month",
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
    const hasUserEverAuthenticatedSpy = spyOn(
      authStateUtil,
      "hasUserEverAuthenticated",
    ).mockReturnValue(true);
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
      wrapper: createWrapper(),
    });
    expect(result.current).toEqual({ kind: "open" });
    hasUserEverAuthenticatedSpy.mockRestore();
  });

  it("fails open when billing status fetch fails", async () => {
    const hasUserEverAuthenticatedSpy = spyOn(
      authStateUtil,
      "hasUserEverAuthenticated",
    ).mockReturnValue(true);
    stubConfig(true);
    server.use(
      rest.get(`${ENV_WEB.API_BASEURL}/billing/status`, (_req, res, ctx) =>
        res(ctx.status(500)),
      ),
    );

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current).toEqual({ kind: "open" });
    });
    hasUserEverAuthenticatedSpy.mockRestore();
  });

  it("fails open when Stripe is unconfigured", async () => {
    const hasUserEverAuthenticatedSpy = spyOn(
      authStateUtil,
      "hasUserEverAuthenticated",
    ).mockReturnValue(true);
    stubConfig(false);

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current).toEqual({ kind: "open" });
    });
    hasUserEverAuthenticatedSpy.mockRestore();
  });

  it("returns server active status", async () => {
    const hasUserEverAuthenticatedSpy = spyOn(
      authStateUtil,
      "hasUserEverAuthenticated",
    ).mockReturnValue(true);
    stubConfig(true);
    stubBilling({
      subscriptionStatus: "active",
      trialEndsAt: null,
      isReadOnly: false,
    });

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        kind: "server",
        status: "active",
        isReadOnly: false,
        trialEndsAt: null,
      });
    });
    hasUserEverAuthenticatedSpy.mockRestore();
  });

  it("returns server awaiting_checkout as read-only", async () => {
    const hasUserEverAuthenticatedSpy = spyOn(
      authStateUtil,
      "hasUserEverAuthenticated",
    ).mockReturnValue(true);
    stubConfig(true);
    stubBilling({
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: null,
      isReadOnly: true,
    });

    const { result } = renderHook(() => useAppAccess(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current).toMatchObject({
        kind: "server",
        status: "awaiting_checkout",
        isReadOnly: true,
      });
    });
    hasUserEverAuthenticatedSpy.mockRestore();
  });
});
