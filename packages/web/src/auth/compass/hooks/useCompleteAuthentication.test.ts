import { renderHook } from "@testing-library/react";
import { createUseCompleteAuthentication } from "./useCompleteAuthentication.factory";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const authSuccessAction = { type: "auth/authSuccess" };
const triggerFetchAction = { type: "importLatest/triggerFetch" };

const dependencies = {
  authSuccess: mock(() => authSuccessAction),
  clearAnonymousCalendarChangeSignUpPrompt: mock(),
  markUserAsAuthenticated: mock(),
  refreshUserMetadata: mock(),
  syncPendingLocalEvents: mock(),
  triggerFetch: mock(() => triggerFetchAction),
  useAppDispatch: mock(),
  useSession: mock(),
};

describe("useCompleteAuthentication", () => {
  const dispatch = mock();
  const setAuthenticated = mock();

  beforeEach(() => {
    dispatch.mockClear();
    setAuthenticated.mockClear();

    dependencies.authSuccess.mockClear();
    dependencies.clearAnonymousCalendarChangeSignUpPrompt.mockClear();
    dependencies.markUserAsAuthenticated.mockClear();
    dependencies.refreshUserMetadata.mockClear();
    dependencies.syncPendingLocalEvents.mockClear();
    dependencies.triggerFetch.mockClear();
    dependencies.useAppDispatch.mockClear();
    dependencies.useSession.mockClear();

    dependencies.useAppDispatch.mockReturnValue(dispatch);
    dependencies.useSession.mockReturnValue({
      authenticated: false,
      setAuthenticated,
    });
    dependencies.refreshUserMetadata.mockResolvedValue(true);
    dependencies.syncPendingLocalEvents.mockResolvedValue(true);
  });

  it("marks the user authenticated and triggers an event fetch", async () => {
    const useCompleteAuthentication =
      createUseCompleteAuthentication(dependencies);
    const onComplete = mock();
    const { result } = renderHook(() => useCompleteAuthentication());

    await result.current({ email: "test@example.com", onComplete });

    expect(
      dependencies.clearAnonymousCalendarChangeSignUpPrompt,
    ).toHaveBeenCalled();
    expect(dependencies.markUserAsAuthenticated).toHaveBeenCalledWith(
      "test@example.com",
    );
    expect(setAuthenticated).toHaveBeenCalledWith(true);
    expect(dispatch).toHaveBeenCalledWith(authSuccessAction);
    expect(dependencies.refreshUserMetadata).toHaveBeenCalled();
    expect(dependencies.syncPendingLocalEvents).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(triggerFetchAction);
    expect(onComplete).toHaveBeenCalled();
  });

  it("waits for pending local event sync before completing", async () => {
    const useCompleteAuthentication =
      createUseCompleteAuthentication(dependencies);
    const onComplete = mock();
    const { result } = renderHook(() => useCompleteAuthentication());

    let resolveSync: (value: boolean) => void = () => {};
    dependencies.syncPendingLocalEvents.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveSync = resolve;
      }),
    );

    const completion = result.current({ onComplete });

    await Promise.resolve();

    expect(onComplete).not.toHaveBeenCalled();

    resolveSync(true);
    await completion;

    expect(onComplete).toHaveBeenCalled();
  });
});
