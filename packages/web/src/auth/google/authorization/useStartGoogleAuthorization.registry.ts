import { useStartGoogleAuthorizationImpl } from "./useStartGoogleAuthorization.impl";

export type UseStartGoogleAuthorization =
  typeof useStartGoogleAuthorizationImpl;

let useStartGoogleAuthorizationHook: UseStartGoogleAuthorization =
  useStartGoogleAuthorizationImpl;

export function registerUseStartGoogleAuthorizationForTests(
  hook: UseStartGoogleAuthorization,
): void {
  useStartGoogleAuthorizationHook = hook;
}

export function resetUseStartGoogleAuthorizationForTests(): void {
  useStartGoogleAuthorizationHook = useStartGoogleAuthorizationImpl;
}

export function useStartGoogleAuthorizationFromRegistry(
  ...args: Parameters<UseStartGoogleAuthorization>
): ReturnType<UseStartGoogleAuthorization> {
  return useStartGoogleAuthorizationHook(...args);
}
