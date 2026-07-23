import SuperTokensSession from "supertokens-web-js/recipe/session";

export type SessionApiPort = Pick<
  typeof SuperTokensSession,
  | "doesSessionExist"
  | "getUserId"
  | "signOut"
  | "getAccessToken"
  | "validateClaims"
  | "getClaimValue"
  | "PrimitiveClaim"
  | "BooleanClaim"
  | "PrimitiveArrayClaim"
  | "attemptRefreshingSession"
  | "getInvalidClaimsFromResponse"
  | "getAccessTokenPayloadSecurely"
>;

function createProductionSessionApiPort(): SessionApiPort {
  return {
    doesSessionExist:
      SuperTokensSession.doesSessionExist.bind(SuperTokensSession),
    getUserId: SuperTokensSession.getUserId.bind(SuperTokensSession),
    signOut: SuperTokensSession.signOut.bind(SuperTokensSession),
    getAccessToken: SuperTokensSession.getAccessToken.bind(SuperTokensSession),
    validateClaims: SuperTokensSession.validateClaims.bind(SuperTokensSession),
    getClaimValue: SuperTokensSession.getClaimValue.bind(SuperTokensSession),
    PrimitiveClaim: SuperTokensSession.PrimitiveClaim,
    BooleanClaim: SuperTokensSession.BooleanClaim,
    PrimitiveArrayClaim: SuperTokensSession.PrimitiveArrayClaim,
    attemptRefreshingSession:
      SuperTokensSession.attemptRefreshingSession.bind(SuperTokensSession),
    getInvalidClaimsFromResponse:
      SuperTokensSession.getInvalidClaimsFromResponse.bind(SuperTokensSession),
    getAccessTokenPayloadSecurely:
      SuperTokensSession.getAccessTokenPayloadSecurely.bind(SuperTokensSession),
  };
}

let sessionApiPort: SessionApiPort = createProductionSessionApiPort();

export function getSessionApiPort(): SessionApiPort {
  return sessionApiPort;
}

export function registerSessionApiPort(port: SessionApiPort): void {
  sessionApiPort = port;
}

export function resetSessionApiPort(): void {
  sessionApiPort = createProductionSessionApiPort();
}
