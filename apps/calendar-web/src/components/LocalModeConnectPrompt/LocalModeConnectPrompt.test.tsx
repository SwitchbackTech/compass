import "@testing-library/jest-dom";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { mockModuleForFile } from "@web/__tests__/utils/mock-module.test.util";
import { SessionContext } from "@web/auth/compass/session/session.context";
import * as realSignupFunnel from "@web/auth/posthog/signup-funnel";
import * as realTrack from "@web/auth/posthog/track";
import * as realProviderAvailability from "@web/auth/providers/useIsProviderAvailable";
import * as realSignInProviders from "@web/auth/providers/useSignInProviders";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { AuthModalContext } from "@web/components/AuthModal/hooks/useAuthModal";
import {
  LOCAL_MODE_CONNECT_PROMPT_CONNECT_LABEL,
  LOCAL_MODE_CONNECT_PROMPT_MESSAGE,
  LocalModeConnectPrompt,
} from "@web/components/LocalModeConnectPrompt/LocalModeConnectPrompt";
import { resetLocalModeConnectPromptStoreForTests } from "@web/components/LocalModeConnectPrompt/local-mode-connect.store";
import {
  initialShortcutShowcaseState,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockStartSignIn = mock();
const trackSpy = mock();
const trackSignupStartedAtClickSpy = mock();

mockModuleForFile(
  "@web/auth/providers/useSignInProviders",
  realSignInProviders,
  {
    useSignInProviders: () => ({
      available: ["google"],
      startSignIn: mockStartSignIn,
      isLoading: false,
      loadingKind: null,
      byKind: {},
    }),
  },
);

mockModuleForFile(
  "@web/auth/providers/useIsProviderAvailable",
  realProviderAvailability,
  {
    useIsProviderAvailable: () => true,
  },
);

mockModuleForFile("@web/auth/posthog/track", realTrack, {
  track: trackSpy,
});

mockModuleForFile("@web/auth/posthog/signup-funnel", realSignupFunnel, {
  trackSignupStartedAtClick: trackSignupStartedAtClickSpy,
});

const renderPrompt = () =>
  render(
    <HotkeysProvider>
      <SessionContext.Provider
        value={{ authenticated: false, setAuthenticated: mock() }}
      >
        <AuthModalContext.Provider
          value={{
            isOpen: false,
            currentView: "login",
            openModal: mock(),
            closeModal: mock(),
            setView: mock(),
          }}
        >
          <LocalModeConnectPrompt />
        </AuthModalContext.Provider>
      </SessionContext.Provider>
    </HotkeysProvider>,
  );

describe("LocalModeConnectPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    mockStartSignIn.mockClear();
    trackSpy.mockClear();
    trackSignupStartedAtClickSpy.mockClear();
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_WELCOME, "true");
    persistentBrowserStore.set(
      STORAGE_KEYS.ANONYMOUS_CALENDAR_WRITE_COUNT,
      "3",
    );
    resetLocalModeConnectPromptStoreForTests();
  });

  it("does not render before the write threshold", () => {
    persistentBrowserStore.set(
      STORAGE_KEYS.ANONYMOUS_CALENDAR_WRITE_COUNT,
      "2",
    );
    resetLocalModeConnectPromptStoreForTests();
    renderPrompt();
    expect(
      screen.queryByRole("complementary", { name: "Connect Google" }),
    ).toBeNull();
  });

  it("renders after three anonymous writes with connect copy", () => {
    renderPrompt();
    expect(
      screen.getByRole("complementary", { name: "Connect Google" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(LOCAL_MODE_CONNECT_PROMPT_MESSAGE),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: LOCAL_MODE_CONNECT_PROMPT_CONNECT_LABEL,
      }),
    ).toBeInTheDocument();
  });

  it("fires connect_prompt_shown once with event count", async () => {
    renderPrompt();
    await waitFor(() => {
      expect(trackSpy).toHaveBeenCalledWith("connect_prompt_shown", {
        events_created_count: 3,
        provider: "google",
      });
    });
    expect(
      trackSpy.mock.calls.filter(([event]) => event === "connect_prompt_shown"),
    ).toHaveLength(1);
  });

  it("starts Google signup and tracks click", async () => {
    const user = userEvent.setup();
    renderPrompt();
    await user.click(
      screen.getByRole("button", {
        name: LOCAL_MODE_CONNECT_PROMPT_CONNECT_LABEL,
      }),
    );

    expect(trackSpy).toHaveBeenCalledWith("connect_prompt_clicked", {
      events_created_count: 3,
      provider: "google",
    });
    expect(trackSignupStartedAtClickSpy).toHaveBeenCalledWith(
      "local_mode_connect_prompt",
    );
    expect(mockStartSignIn).toHaveBeenCalledWith("google");
  });

  it("dismisses on Escape and persists", async () => {
    renderPrompt();
    pressKey("Escape");

    await waitFor(() => {
      expect(
        screen.queryByRole("complementary", { name: "Connect Google" }),
      ).toBeNull();
    });
    expect(trackSpy).toHaveBeenCalledWith("connect_prompt_dismissed", {
      events_created_count: 3,
      provider: "google",
    });
    expect(
      persistentBrowserStore.get(
        STORAGE_KEYS.HAS_DISMISSED_LOCAL_MODE_CONNECT_PROMPT,
      ),
    ).toBe("true");
  });

  it("connects on Enter when focus is not in a field", async () => {
    renderPrompt();
    pressKey("Enter");
    expect(mockStartSignIn).toHaveBeenCalledWith("google");
  });
});
