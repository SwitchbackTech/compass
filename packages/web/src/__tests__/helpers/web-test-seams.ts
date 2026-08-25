import * as actualReactToastify from "react-toastify";
import { resetUseCompleteAuthenticationForTests } from "@web/auth/compass/hooks/useCompleteAuthentication.registry";
import {
  registerSessionApiPort,
  resetSessionApiPort,
  type SessionApiPort,
} from "@web/auth/compass/session/session.port";
import {
  registerUseStartGoogleAuthorizationForTests,
  resetUseStartGoogleAuthorizationForTests,
  type UseStartGoogleAuthorization,
} from "@web/auth/google/authorization/useStartGoogleAuthorization";
import {
  resetGoogleAvailabilityForTests,
  setGoogleAvailabilityForTests,
} from "@web/auth/google/hooks/useIsGoogleAvailable/useIsGoogleAvailable";
import {
  registerToastPort,
  resetToastPort,
  type ToastApi,
  type ToastPort,
} from "@web/common/utils/toast/toast.port";
import {
  type NotificationPort,
  registerNotificationPort,
  resetNotificationPort,
} from "@web/notifications/notification.port";
import { resetNotificationStoreForTests } from "@web/notifications/notification.store";
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
    PrimitiveArrayClaim:
      mock() as unknown as SessionApiPort["PrimitiveArrayClaim"],
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
  const toastInfo = mock();
  const toastSuccess = mock();
  const toastIsActive = mock(() => false);

  const toast = Object.assign(toastFn, {
    POSITION: actualReactToastify.toast.POSITION,
    TYPE: actualReactToastify.toast.TYPE,
    dismiss: toastDismiss,
    error: toastError,
    info: toastInfo,
    isActive: toastIsActive,
    success: toastSuccess,
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
      info: toastInfo,
      success: toastSuccess,
      isActive: toastIsActive,
    },
  };
}

/**
 * jsdom has no Notification global, so without a seam every test would see an
 * unsupported browser and the notification UI would silently vanish. The
 * default port is supported but ungranted — the state a first-run user is in.
 */
export function createTestNotificationPort(options?: {
  permission?: NotificationPermission;
  /** What requestPermission resolves to; defaults to the current permission. */
  respondWith?: NotificationPermission;
  supported?: boolean;
}) {
  let permission: NotificationPermission = options?.permission ?? "default";
  const permissionListeners = new Set<() => void>();

  const show = mock();
  const requestPermission = mock(async () => {
    permission = options?.respondWith ?? permission;
    return permission;
  });

  const setPermission = (next: NotificationPermission) => {
    permission = next;
    for (const listener of permissionListeners) listener();
  };

  const port: NotificationPort = {
    isSupported: () => options?.supported ?? true,
    getPermission: () => permission,
    requestPermission,
    show,
    observePermission: (onChange) => {
      permissionListeners.add(onChange);
      return () => permissionListeners.delete(onChange);
    },
  };

  return { port, setPermission, mocks: { show, requestPermission } };
}

export function createDefaultTestGoogleAuthorizationHook(): UseStartGoogleAuthorization {
  return () => ({
    loading: false,
    startGoogleAuthorization: mock(),
  });
}

export function createTestEmailPasswordPort() {
  return {
    signUp: mock().mockResolvedValue({
      status: "OK" as const,
      user: { emails: ["test@example.com"] },
    }),
    signIn: mock().mockResolvedValue({
      status: "OK" as const,
      user: { emails: ["test@example.com"] },
    }),
    sendPasswordResetEmail: mock().mockResolvedValue({ status: "OK" as const }),
    submitNewPassword: mock().mockResolvedValue({ status: "OK" as const }),
    getResetPasswordTokenFromURL: mock().mockReturnValue("token"),
  };
}

export function installDefaultWebTestSeams(): void {
  registerSessionApiPort(createDefaultTestSessionPort());
  registerToastPort(createTestToastPort().port);
  registerNotificationPort(createTestNotificationPort().port);
  // Re-seed after the port is in place: store resets run in afterEach, while
  // the previous test's port is still registered, so a test that granted
  // permission would otherwise leak "granted" into the next one.
  resetNotificationStoreForTests();
  registerUseStartGoogleAuthorizationForTests(
    createDefaultTestGoogleAuthorizationHook(),
  );
  // Skip /config fetch (no MSW handler); "unavailable" matches prior failed-fetch default.
  resetGoogleAvailabilityForTests();
  setGoogleAvailabilityForTests("unavailable");
}

export function resetWebTestSeams(): void {
  resetSessionApiPort();
  resetToastPort();
  resetNotificationPort();
  resetUseStartGoogleAuthorizationForTests();
  // AuthModal owns emailpassword reset — production SuperTokens patches XHR vs MSW.
  resetUseCompleteAuthenticationForTests();
  resetGoogleAvailabilityForTests();
}
