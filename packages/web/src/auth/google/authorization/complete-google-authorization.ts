import {
  type GoogleAuthCodeRequest,
  GoogleConnectErrorResponseSchema,
} from "@core/types/auth.types";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  GOOGLE_AUTH_SCOPES_REQUIRED,
  GOOGLE_AUTHORIZATION_ERROR_MESSAGE,
  MISSING_GOOGLE_SCOPES_ERROR_MESSAGE,
} from "./google-authorization.constants";
import {
  clearGoogleAuthorizationIntent,
  readGoogleAuthorizationIntent,
} from "./google-authorization.storage";
import {
  buildGoogleAuthCallbackUrl,
  buildGoogleAuthCodePayload,
} from "./google-authorization.util";

type CompleteAuthentication = (input: {
  email?: string;
  onComplete?: () => void;
}) => Promise<void>;

export type GoogleAuthorizationAuthAdapter = {
  connectGoogle(data: GoogleAuthCodeRequest): Promise<unknown>;
  loginOrSignup(data: GoogleAuthCodeRequest): Promise<{
    user: { emails?: string[] };
  }>;
};

export type CompleteGoogleAuthorizationOptions = {
  authApi: GoogleAuthorizationAuthAdapter;
  completeAuthentication: CompleteAuthentication;
  refreshUserMetadata: () => Promise<void> | void;
  requestEventFetch?: () => void;
  search: string;
};

export type CompleteGoogleAuthorizationResult =
  | {
      returnPath: string;
      status: "completed";
    }
  | {
      message: string;
      returnPath: string;
      status: "failed";
    };

const fail = (
  message = GOOGLE_AUTHORIZATION_ERROR_MESSAGE,
  returnPath = ROOT_ROUTES.DAY,
): CompleteGoogleAuthorizationResult => ({
  message,
  returnPath,
  status: "failed",
});

const parseGoogleConnectErrorMessage = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined;
  }

  const data = (error as { response?: { data?: unknown } }).response?.data;
  const parsed = GoogleConnectErrorResponseSchema.safeParse(data);

  return parsed.success ? parsed.data.message : undefined;
};

export async function completeGoogleAuthorization({
  authApi,
  completeAuthentication,
  refreshUserMetadata,
  requestEventFetch,
  search,
}: CompleteGoogleAuthorizationOptions): Promise<CompleteGoogleAuthorizationResult> {
  const params = new URLSearchParams(search);
  const state = params.get("state");

  if (!state) {
    return fail();
  }

  const savedIntent = readGoogleAuthorizationIntent(state);
  clearGoogleAuthorizationIntent(state);
  const returnPath = savedIntent?.returnPath ?? ROOT_ROUTES.DAY;

  if (!savedIntent || params.get("error")) {
    return fail(GOOGLE_AUTHORIZATION_ERROR_MESSAGE, returnPath);
  }

  const code = params.get("code");

  if (!code) {
    return fail(GOOGLE_AUTHORIZATION_ERROR_MESSAGE, returnPath);
  }

  const grantedScopes = new Set((params.get("scope") ?? "").split(" "));
  const isMissingRequiredScope = GOOGLE_AUTH_SCOPES_REQUIRED.some(
    (scope) => !grantedScopes.has(scope),
  );

  if (isMissingRequiredScope) {
    return fail(MISSING_GOOGLE_SCOPES_ERROR_MESSAGE, returnPath);
  }

  const payload = buildGoogleAuthCodePayload({
    code,
    scope: params.get("scope") ?? undefined,
    state,
    redirectUri: buildGoogleAuthCallbackUrl(),
  });

  try {
    if (savedIntent.intent === "signIn") {
      const result = await authApi.loginOrSignup(payload);
      await completeAuthentication({
        email: result.user.emails?.[0],
      });
    } else {
      await authApi.connectGoogle(payload);
      await refreshUserMetadata();
      requestEventFetch?.();
    }

    return {
      returnPath,
      status: "completed",
    };
  } catch (error) {
    const parsedMessage = parseGoogleConnectErrorMessage(error);

    if (parsedMessage) {
      return fail(parsedMessage, returnPath);
    }

    return fail(GOOGLE_AUTHORIZATION_ERROR_MESSAGE, returnPath);
  }
}
