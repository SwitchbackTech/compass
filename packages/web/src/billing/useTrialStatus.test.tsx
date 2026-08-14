import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { type PropsWithChildren } from "react";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import * as authStateUtil from "@web/auth/compass/state/auth.state.util";
import { billingQueryKeys } from "@web/billing/billing.query";
import { useTrialStatus } from "@web/billing/useTrialStatus";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const stubConfig = (enforcement: boolean) => {
  server.use(
    rest.get(`${ENV_WEB.API_BASEURL}/config`, (_req, res, ctx) =>
      res(
        ctx.json({
          google: { isConfigured: false },
          billing: {
            isConfigured: true,
            enforcement,
            priceDisplay: "$7.99/month",
            trialLengthDays: 7,
          },
        }),
      ),
    ),
  );
};

const renderTrialStatus = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(() => useTrialStatus(), { wrapper });
  await waitFor(() => {
    expect(queryClient.getQueryState(billingQueryKeys.config)?.status).not.toBe(
      "pending",
    );
  });
  return rendered;
};

describe("useTrialStatus", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts the clock on first use and reports a full trial", async () => {
    stubConfig(true);
    const { result } = await renderTrialStatus();

    expect(result.current.isExpired).toBe(false);
    expect(result.current.daysLeft).toBe(7);
    expect(result.current.isAnonymousTrial).toBe(true);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.TRIAL_STARTED_AT),
    ).toBeTruthy();
  });

  it("counts down without expiring inside the window", async () => {
    stubConfig(true);
    persistentBrowserStore.set(STORAGE_KEYS.TRIAL_STARTED_AT, daysAgo(5));

    const { result } = await renderTrialStatus();

    expect(result.current.daysLeft).toBe(2);
    expect(result.current.isExpired).toBe(false);
  });

  it("expires once the window has passed", async () => {
    stubConfig(true);
    persistentBrowserStore.set(STORAGE_KEYS.TRIAL_STARTED_AT, daysAgo(8));

    const { result } = await renderTrialStatus();

    expect(result.current.daysLeft).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });

  // Regression: `authenticated` from SessionContext is false until the async
  // SuperTokens check resolves, so it cannot be the only guard. Someone who
  // tried Compass anonymously, signed up, and kept the same browser still has
  // a stale trial.started-at; gating on the context alone flashed "your trial
  // has ended" at them on every load.
  //
  // hasUserEverAuthenticated is spied directly rather than driven through
  // real localStorage state: several other test files in this suite
  // mock.module the whole auth.state.util module with a bare `hasAuthenticated`
  // stub and no restoration, which leaks process-wide across bun test files -
  // spying on this file's own resolved binding sidesteps that ordering-
  // dependent pollution instead of adding to it.
  it("never gates a user who has authenticated before, despite a stale expired clock", async () => {
    stubConfig(true);
    persistentBrowserStore.set(STORAGE_KEYS.TRIAL_STARTED_AT, daysAgo(30));
    const hasUserEverAuthenticatedSpy = spyOn(
      authStateUtil,
      "hasUserEverAuthenticated",
    ).mockReturnValue(true);

    const { result } = await renderTrialStatus();

    expect(result.current.isExpired).toBe(false);
    expect(result.current.isAnonymousTrial).toBe(false);

    hasUserEverAuthenticatedSpy.mockRestore();
  });

  // Regression: pausing must not burn the clock. If we stamped
  // trial.started-at while paused, flipping enforcement on later would find
  // a browser whose 7 days were already ticking away during the pause.
  it("does not gate and does not stamp the clock while enforcement is paused", async () => {
    stubConfig(false);
    persistentBrowserStore.set(STORAGE_KEYS.TRIAL_STARTED_AT, daysAgo(30));

    const { result } = await renderTrialStatus();

    expect(result.current.isExpired).toBe(false);
    expect(result.current.isAnonymousTrial).toBe(false);
  });

  it("does not stamp a fresh visitor's clock while enforcement is paused", async () => {
    stubConfig(false);

    await renderTrialStatus();

    expect(
      persistentBrowserStore.get(STORAGE_KEYS.TRIAL_STARTED_AT),
    ).toBeNull();
  });
});
