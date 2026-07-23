import * as actualReactToastify from "react-toastify";
import {
  registerSessionApiPort,
  resetSessionApiPort,
  type SessionApiPort,
} from "@web/auth/compass/session/session.port";
import {
  registerUseStartGoogleAuthorizationForTests,
  resetUseStartGoogleAuthorizationForTests,
  type UseStartGoogleAuthorization,
} from "@web/auth/google/authorization/useStartGoogleAuthorization.registry";
import {
  registerToastPort,
  resetToastPort,
  type ToastApi,
  type ToastPort,
} from "@web/common/utils/toast/toast.port";
import { mock } from "bun:test";

export function createDefaultTestSessionPort(): SessionApiPort {
  return {
    doesSessionExist: mock().mockResolvedValue(true),
    getUserId: mock().mockResolvedValue("mock-user-id"),
    signOut: mock().mockResolvedValue(undefined),
    getAccessToken: mock().mockResolvedValue("mock-access-token"),
    validateClaims: mock().mockResolvedValue([]),
    getClaimValue: mock(),
    PrimitiveClaim: mock() as unknown as SessionApiPort["PrimitiveClaim"],
    BooleanClaim: mock() as unknown as SessionApiPort["BooleanClaim"],
    PrimitiveArrayClaim: mock() as unknown as SessionApiPort["PrimitiveArrayClaim"],
    attemptRefreshingSession: mock().mockResolvedValue(true),
    getInvalidClaimsFromResponse: mock().mockResolvedValue([]),
    getAccessTokenPayloadSecurely: mock().mockResolvedValue({
      mockKey: "mockValue",
    }),
  };
}

export function createTestToastPort() {
  const toastFn = mock(() => "mock-toast-id");
  const toastUpdate = mock();
  const toastDismiss = mock();
  const toastError = mock();
  const toastIsActive = mock(() => false);

  const toast = Object.assign(toastFn, {
    POSITION: actualReactToastify.toast.POSITION,
    TYPE: actualReactToastify.toast.TYPE,
    dismiss: toastDismiss,
    error: toastError,
    info: mock(),
    isActive: toastIsActive,
    success: mock(),
    update: toastUpdate,
    warning: mock(),
    warn: mock(),
    loading: mock(),
    promise: mock(),
    dark: mock(),
    done: mock(),
    onChange: mock(),
    clearWaitingQueue: mock(),
  }) as ToastApi;

  return {
    port: { toast } satisfies ToastPort,
    mocks: {
      toast: toastFn,
      update: toastUpdate,
      dismiss: toastDismiss,
      error: toastError,
      isActive: toastIsActive,
    },
  };
}

export function createDefaultTestToastPort(): ToastPort {
  return createTestToastPort().port;
}

export function createDefaultTestGoogleAuthorizationHook(): UseStartGoogleAuthorization {
  return () => ({
    loading: false,
    startGoogleAuthorization: mock(),
  });
}

export function installDefaultWebTestSeams(): void {
  registerSessionApiPort(createDefaultTestSessionPort());
  registerToastPort(createDefaultTestToastPort());
  registerUseStartGoogleAuthorizationForTests(
    createDefaultTestGoogleAuthorizationHook(),
  );
}

export function resetWebTestSeams(): void {
  resetSessionApiPort();
  resetToastPort();
  resetUseStartGoogleAuthorizationForTests();
}
