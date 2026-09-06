import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { createMockConnection } from "@web/__tests__/utils/factories/calendar.factory";
import { mockModuleForFile } from "@web/__tests__/utils/mock-module.test.util";
import { SessionContext } from "@web/auth/compass/session/session.context";
import {
  CALENDAR_HOST_EXPLAINER,
  CONNECT_THE_CALENDAR_YOU_USE,
} from "@web/auth/providers/provider-copy.util";
import * as realAvailableProviders from "@web/auth/providers/useAvailableConnectProviders";
import * as realConnectProvider from "@web/auth/providers/useConnectProvider";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { AuthModalContext } from "@web/components/AuthModal/hooks/useAuthModal";
import { CONNECT_CALENDAR_LATER_LABEL } from "@web/components/ConnectCalendarPrompt/ConnectCalendarPrompt";
import {
  initialConnectCalendarPromptState,
  useConnectCalendarPromptStore,
} from "@web/components/ConnectCalendarPrompt/connect-calendar.store";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

let available: ProviderKind[] = ["google", "microsoft", "apple"];
const mockConnectGoogle = mock();
const mockConnectMicrosoft = mock();
const mockConnectApple = mock();

mockModuleForFile(
  "@web/auth/providers/useAvailableConnectProviders",
  realAvailableProviders,
  { useAvailableConnectProviders: () => available },
);

const connectByKind: Record<ProviderKind, ReturnType<typeof mock>> = {
  google: mockConnectGoogle,
  microsoft: mockConnectMicrosoft,
  apple: mockConnectApple,
};

const buttonLabelByKind: Record<ProviderKind, string> = {
  google: "Connect Google",
  microsoft: "Connect Microsoft Calendar",
  apple: "Connect Apple Calendar",
};

mockModuleForFile(
  "@web/auth/providers/useConnectProvider",
  realConnectProvider,
  {
    useConnectProvider: (kind: ProviderKind) => ({
      state: "NOT_CONNECTED",
      isAvailable: true,
      isConnecting: false,
      isRefreshing: false,
      commandAction: null,
      connect: connectByKind[kind],
    }),
  },
);

const gateModuleUrl = new URL(
  `./ConnectCalendarPromptGate.tsx?test=${Math.random().toString(36).slice(2)}`,
  import.meta.url,
);
const { ConnectCalendarPromptGate: GateUnderTest } = (await import(
  gateModuleUrl.href
)) as typeof import("./ConnectCalendarPromptGate");

const emptyMetadata = {
  google: { connectionState: "NOT_CONNECTED" as const, connections: [] },
  connections: [],
};

const oneConnection = createMockConnection("user@example.com");
const oneConnectionMetadata = {
  google: {
    connectionState: "HEALTHY" as const,
    connections: [oneConnection],
  },
  connections: [oneConnection],
};

const renderGate = (options?: { authenticated?: boolean }) => {
  const authenticated = options?.authenticated ?? true;

  return render(
    <SessionContext.Provider
      value={{ authenticated, setAuthenticated: mock() }}
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
        <GateUnderTest />
      </AuthModalContext.Provider>
    </SessionContext.Provider>,
  );
};

describe("ConnectCalendarPromptGate", () => {
  beforeEach(() => {
    available = ["google", "microsoft", "apple"];
    mockConnectGoogle.mockClear();
    mockConnectMicrosoft.mockClear();
    mockConnectApple.mockClear();
    useConnectCalendarPromptStore.setState({
      ...initialConnectCalendarPromptState,
      isDismissed: false,
    });
    persistentBrowserStore.set(
      STORAGE_KEYS.HAS_DISMISSED_CONNECT_CALENDAR_PROMPT,
      "",
    );
    userMetadataActions.set(emptyMetadata);
  });

  afterEach(() => {
    userMetadataActions.clear();
  });

  it("renders for a signed-in user with zero connections", () => {
    renderGate();

    expect(
      screen.getByRole("dialog", { name: CONNECT_THE_CALENDAR_YOU_USE }),
    ).toBeInTheDocument();
    expect(screen.getByText(CONNECT_THE_CALENDAR_YOU_USE)).toBeInTheDocument();
    expect(screen.getByText(CALENDAR_HOST_EXPLAINER)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: CONNECT_CALENDAR_LATER_LABEL }),
    ).toBeInTheDocument();
  });

  it("does not render when the user already has a connection", () => {
    userMetadataActions.set(oneConnectionMetadata);
    renderGate();

    expect(
      screen.queryByRole("dialog", { name: CONNECT_THE_CALENDAR_YOU_USE }),
    ).toBeNull();
  });

  it("does not render for an anonymous user", () => {
    renderGate({ authenticated: false });
    expect(
      screen.queryByRole("dialog", { name: CONNECT_THE_CALENDAR_YOU_USE }),
    ).toBeNull();
  });

  it("does not render after dismissal", () => {
    persistentBrowserStore.set(
      STORAGE_KEYS.HAS_DISMISSED_CONNECT_CALENDAR_PROMPT,
      "true",
    );
    useConnectCalendarPromptStore.setState({ isDismissed: true });
    renderGate();

    expect(
      screen.queryByRole("dialog", { name: CONNECT_THE_CALENDAR_YOU_USE }),
    ).toBeNull();
  });

  it("routes each provider button to its connect flow", async () => {
    const user = userEvent.setup();
    renderGate();

    await user.click(
      screen.getByRole("button", { name: buttonLabelByKind.google }),
    );
    expect(mockConnectGoogle).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: buttonLabelByKind.microsoft }),
    );
    expect(mockConnectMicrosoft).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: buttonLabelByKind.apple }),
    );
    expect(mockConnectApple).toHaveBeenCalledTimes(1);
  });

  it("persists dismissal from I'll do this later", async () => {
    const user = userEvent.setup();
    renderGate();

    await user.click(
      screen.getByRole("button", { name: CONNECT_CALENDAR_LATER_LABEL }),
    );

    await waitFor(
      () => {
        expect(
          persistentBrowserStore.get(
            STORAGE_KEYS.HAS_DISMISSED_CONNECT_CALENDAR_PROMPT,
          ),
        ).toBe("true");
      },
      { timeout: 1000 },
    );
    expect(useConnectCalendarPromptStore.getState().isDismissed).toBe(true);
  });
});
