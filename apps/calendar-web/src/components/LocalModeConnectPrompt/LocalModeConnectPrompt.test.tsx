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
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { AuthModalContext } from "@web/components/AuthModal/hooks/useAuthModal";
import {
  initialFirstEventPromptState,
  useFirstEventPromptStore,
} from "@web/components/FirstEventPrompt/first-event.store";
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

const mockOpenModal = mock();
const trackSpy = mock();
const trackSignupStartedAtClickSpy = mock();

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
            openModal: mockOpenModal,
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
    mockOpenModal.mockClear();
    trackSpy.mockClear();
    trackSignupStartedAtClickSpy.mockClear();
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    useFirstEventPromptStore.setState({
      ...initialFirstEventPromptState,
      isDone: true,
    });
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_WELCOME, "true");
    persistentBrowserStore.set(
      STORAGE_KEYS.ANONYMOUS_CALENDAR_WRITE_COUNT,
      "1",
    );
    resetLocalModeConnectPromptStoreForTests();
  });

  it("does not render before engagement", () => {
    persistentBrowserStore.set(
      STORAGE_KEYS.ANONYMOUS_CALENDAR_WRITE_COUNT,
      "0",
    );
    resetLocalModeConnectPromptStoreForTests();
    renderPrompt();
    expect(
      screen.queryByRole("complementary", {
        name: "Start your free trial",
      }),
    ).toBeNull();
  });

  it("renders after one anonymous write with trial copy and S keycap", () => {
    renderPrompt();
    expect(
      screen.getByRole("complementary", {
        name: "Start your free trial",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(LOCAL_MODE_CONNECT_PROMPT_MESSAGE),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: LOCAL_MODE_CONNECT_PROMPT_CONNECT_LABEL,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("fires connect_prompt_shown once with event count", async () => {
    renderPrompt();
    await waitFor(() => {
      expect(trackSpy).toHaveBeenCalledWith("connect_prompt_shown", {
        events_created_count: 1,
        provider: "google",
      });
    });
    expect(
      trackSpy.mock.calls.filter(([event]) => event === "connect_prompt_shown"),
    ).toHaveLength(1);
  });

  it("opens signup and tracks click", async () => {
    const user = userEvent.setup();
    renderPrompt();
    await user.click(
      screen.getByRole("button", {
        name: LOCAL_MODE_CONNECT_PROMPT_CONNECT_LABEL,
      }),
    );

    expect(trackSpy).toHaveBeenCalledWith("connect_prompt_clicked", {
      events_created_count: 1,
      provider: "google",
    });
    expect(trackSignupStartedAtClickSpy).toHaveBeenCalledWith(
      "local_mode_connect_prompt",
    );
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
  });

  it("starts signup on S", () => {
    renderPrompt();
    pressKey("S");
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
  });

  it("dismisses on Escape and persists", async () => {
    renderPrompt();
    pressKey("Escape");

    await waitFor(() => {
      expect(
        screen.queryByRole("complementary", {
          name: "Start your free trial",
        }),
      ).toBeNull();
    });
    expect(trackSpy).toHaveBeenCalledWith("connect_prompt_dismissed", {
      events_created_count: 1,
      provider: "google",
    });
    expect(
      persistentBrowserStore.get(
        STORAGE_KEYS.HAS_DISMISSED_LOCAL_MODE_CONNECT_PROMPT,
      ),
    ).toBe("true");
  });
});
