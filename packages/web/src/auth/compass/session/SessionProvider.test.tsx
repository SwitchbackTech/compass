import { act, renderHook, waitFor } from "@testing-library/react";
import { useContext } from "react";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// Create mocks at module level
const refreshUserMetadata = mock().mockResolvedValue(undefined);
const openStream = mock();
const closeStream = mock();
const getStream = mock();
const dispatch = mock();
const markUserAsAuthenticated = mock();
const getLastKnownEmail = mock().mockReturnValue("test@example.com");
const clearAnonymousCalendarChangeSignUpPrompt = mock();
const clearAuthenticationState = mock();
const getAuthState = mock();
const hasUserEverAuthenticated = mock();
const markAnonymousCalendarChangeForSignUpPrompt = mock();
const shouldShowAnonymousCalendarChangeSignUpPrompt = mock(() => false);
const subscribeToAuthState = mock();
const updateAuthState = mock();
const doesSessionExist = mock();
const eventListeners = new Set<(event: { action: string }) => void>();
const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock(() => ({}));

mock.module("supertokens-web-js", () => ({
  default: { init: mockSuperTokensInit },
  init: mockSuperTokensInit,
}));

mock.module("supertokens-web-js/recipe/emailpassword", () => ({
  default: { init: mockRecipeInit },
  init: mockRecipeInit,
}));

mock.module("supertokens-web-js/recipe/emailverification", () => ({
  default: { init: mockRecipeInit },
  init: mockRecipeInit,
}));

mock.module("supertokens-web-js/recipe/thirdparty", () => ({
  default: { init: mockRecipeInit },
  init: mockRecipeInit,
}));

mock.module("supertokens-web-js/recipe/session", () => ({
  default: { init: mockRecipeInit },
  init: mockRecipeInit,
}));

mock.module("@web/auth/compass/user/util/user-metadata.util", () => ({
  refreshUserMetadata,
}));

mock.module("@web/sse/provider/SSEProvider", () => ({
  openStream,
  closeStream,
  getStream,
}));

mock.module("@web/store", () => ({
  store: {
    dispatch,
  },
}));

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  clearAnonymousCalendarChangeSignUpPrompt,
  clearAuthenticationState,
  getAuthState,
  getLastKnownEmail,
  hasUserEverAuthenticated,
  markUserAsAuthenticated,
  markAnonymousCalendarChangeForSignUpPrompt,
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState,
  updateAuthState,
}));

mock.module("@web/common/classes/Session", () => ({
  session: {
    doesSessionExist,
    onAnyEvent: (listener: (event: { action: string }) => void) => {
      eventListeners.add(listener);

      return () => eventListeners.delete(listener);
    },
    emit: (_action: string, payload: unknown) =>
      eventListeners.forEach((listener) =>
        listener(payload as { action: string }),
      ),
    on: mock(),
    off: mock(),
    signOut: mock().mockResolvedValue(undefined),
  },
}));

// Dynamic import after mocking
const { session } = require("@web/common/classes/Session") as {
  session: {
    doesSessionExist: ReturnType<typeof mock>;
    onAnyEvent: (listener: (event: { action: string }) => void) => () => void;
    emit: (action: string, payload: unknown) => void;
    on: ReturnType<typeof mock>;
    off: ReturnType<typeof mock>;
  };
};

const { SessionContext } =
  require("./session.context") as typeof import("./session.context");
const { SessionProvider, sessionInit } =
  require("./SessionProvider") as typeof import("./SessionProvider");

describe("SessionProvider sessionInit", () => {
  beforeEach(() => {
    // Reset all mocks
    refreshUserMetadata.mockClear();
    openStream.mockClear();
    closeStream.mockClear();
    getStream.mockClear();
    dispatch.mockClear();
    markUserAsAuthenticated.mockClear();
    getLastKnownEmail.mockClear().mockReturnValue("test@example.com");
    clearAnonymousCalendarChangeSignUpPrompt.mockClear();
    clearAuthenticationState.mockClear();
    getAuthState.mockClear();
    hasUserEverAuthenticated.mockClear();
    markAnonymousCalendarChangeForSignUpPrompt.mockClear();
    shouldShowAnonymousCalendarChangeSignUpPrompt.mockClear();
    shouldShowAnonymousCalendarChangeSignUpPrompt.mockReturnValue(false);
    subscribeToAuthState.mockClear();
    updateAuthState.mockClear();
    doesSessionExist.mockClear();
  });

  it("refreshes user metadata when a session already exists", async () => {
    getStream.mockReturnValue(null);
    doesSessionExist.mockResolvedValue(true);

    sessionInit();

    await waitFor(() => {
      expect(markUserAsAuthenticated).toHaveBeenCalledWith("test@example.com");
      expect(refreshUserMetadata).toHaveBeenCalledTimes(1);
    });
    expect(openStream).toHaveBeenCalledTimes(1);
  });

  it("refreshes metadata on session creation and clears it on sign out", async () => {
    getStream.mockReturnValue({} as EventSource); // stream already open
    doesSessionExist.mockResolvedValue(false);

    sessionInit();

    // Simulate SESSION_CREATED event
    session.emit("SESSION_CREATED", { action: "SESSION_CREATED" });

    await waitFor(() => {
      expect(markUserAsAuthenticated).toHaveBeenCalledWith("test@example.com");
      expect(refreshUserMetadata).toHaveBeenCalledTimes(1);
    });
    // closeStream + openStream both called for SESSION_CREATED
    expect(closeStream).toHaveBeenCalledTimes(1);
    expect(openStream).toHaveBeenCalledTimes(1);

    // Simulate SIGN_OUT event
    session.emit("SIGN_OUT", { action: "SIGN_OUT" });

    expect(dispatch).toHaveBeenCalledWith(authSlice.actions.resetAuth());
    expect(dispatch).toHaveBeenCalledWith(
      userMetadataSlice.actions.clear(undefined),
    );
    expect(closeStream).toHaveBeenCalledTimes(2);
  });

  it("updates session consumers when SuperTokens creates a session", async () => {
    getStream.mockReturnValue({} as EventSource);
    doesSessionExist.mockResolvedValue(false);

    const { result } = renderHook(() => useContext(SessionContext), {
      wrapper: SessionProvider,
    });

    act(() => {
      result.current.setAuthenticated(false);
    });

    expect(result.current.authenticated).toBe(false);

    sessionInit();
    act(() => {
      session.emit("SESSION_CREATED", { action: "SESSION_CREATED" });
    });

    expect(result.current.authenticated).toBe(true);
  });
});
