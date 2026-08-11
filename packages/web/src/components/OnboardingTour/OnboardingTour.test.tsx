import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { OnboardingTour } from "@web/components/OnboardingTour/OnboardingTour";
import {
  initialOnboardingTourState,
  onboardingTourActions,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { beforeEach, describe, expect, it } from "bun:test";

function renderTour(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("OnboardingTour", () => {
  beforeEach(() => {
    useOnboardingTourStore.setState(initialOnboardingTourState);
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR, "");
  });

  it("uses a thick liquid-glass surface so copy stays readable over events", () => {
    onboardingTourActions.start();
    renderTour(<OnboardingTour />);

    const card = screen.getByRole("region", { name: "Onboarding tour" })
      .firstElementChild as HTMLElement;

    expect(card).toHaveClass("bg-surface/95");
    expect(card).toHaveClass("backdrop-blur-2xl");
    expect(card).toHaveClass("backdrop-saturate-150");
    expect(card).not.toHaveClass("bg-surface-overlay");
  });

  it("hides the advance button on a fresh verified step, revealing 'Show me' after repeated attempts", () => {
    onboardingTourActions.start();
    renderTour(<OnboardingTour />);

    expect(screen.queryByRole("button", { name: "Show me" })).toBeNull();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
    });

    const showMe = screen.getByRole("button", { name: "Show me" });
    expect(showMe).toHaveClass("c-button");
    expect(showMe).toHaveClass("c-button-primary");
  });

  it("shows Previous after the first step", () => {
    onboardingTourActions.start();
    onboardingTourActions.advance();
    renderTour(<OnboardingTour />);

    expect(screen.getByRole("button", { name: "Previous" })).toBeTruthy();
  });
});
