type Dispatch = (action: unknown) => unknown;

export type CompleteAuthenticationDependencies = {
  authSuccess: () => unknown;
  clearAnonymousCalendarChangeSignUpPrompt: () => void;
  markUserAsAuthenticated: (email?: string) => void;
  refreshUserMetadata: () => Promise<unknown> | unknown;
  syncPendingLocalEvents: () => Promise<unknown>;
  triggerFetch: () => unknown;
  useAppDispatch: () => Dispatch;
  useSession: () => {
    setAuthenticated: (isAuthenticated: boolean) => void;
  };
};

export function createUseCompleteAuthentication(
  dependencies: CompleteAuthenticationDependencies,
) {
  return function useCompleteAuthenticationWithDependencies() {
    const dispatch = dependencies.useAppDispatch();
    const { setAuthenticated } = dependencies.useSession();

    return async ({
      email,
      onComplete,
    }: {
      email?: string;
      onComplete?: () => void;
    }) => {
      dependencies.clearAnonymousCalendarChangeSignUpPrompt();
      dependencies.markUserAsAuthenticated(email);
      setAuthenticated(true);
      dispatch(dependencies.authSuccess());

      void dependencies.refreshUserMetadata();

      await dependencies.syncPendingLocalEvents();

      dispatch(dependencies.triggerFetch());
      onComplete?.();
    };
  };
}
