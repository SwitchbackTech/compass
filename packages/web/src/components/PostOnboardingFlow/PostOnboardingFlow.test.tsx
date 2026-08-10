import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { PostOnboardingFlow } from "@web/components/PostOnboardingFlow/PostOnboardingFlow";
import { usePostOnboardingFlowStore } from "@web/components/PostOnboardingFlow/post-onboarding-flow.store";
import { beforeEach, describe, expect, it } from "bun:test";

function renderFlow(ui: ReactNode, authenticated: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider
        value={{ authenticated, setAuthenticated: () => {} }}
      >
        {ui}
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe("PostOnboardingFlow", () => {
  beforeEach(() => {
    persistentBrowserStore.set(STORAGE_KEYS.POST_TOUR_STAGE, "");
  });

  it("renders the trial CTA for an anonymous user with a pending trial stage", () => {
    usePostOnboardingFlowStore.setState({ stage: "trial" });
    renderFlow(<PostOnboardingFlow />, false);

    expect(
      screen.getByRole("region", { name: "Start your trial" }),
    ).toBeInTheDocument();
  });

  it("never renders for an authenticated user, even with a stale connect/trial stage", () => {
    // Simulates a user who reached "connect"/"trial" anonymously, then
    // authenticated by a path other than the Connect Google CTA, leaving a
    // stale stage in localStorage/the store from a prior session.
    usePostOnboardingFlowStore.setState({ stage: "trial" });
    renderFlow(<PostOnboardingFlow />, true);

    expect(
      screen.queryByRole("region", { name: "Start your trial" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Connect Google Calendar" }),
    ).not.toBeInTheDocument();
  });

  it("resolves a stale connect/trial stage to done once authenticated becomes true", () => {
    usePostOnboardingFlowStore.setState({ stage: "connect" });
    renderFlow(<PostOnboardingFlow />, true);

    expect(usePostOnboardingFlowStore.getState().stage).toBe("done");
  });
});
