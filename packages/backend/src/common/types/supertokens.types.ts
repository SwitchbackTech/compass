export interface SupertokensAccessTokenPayload {
  iat: number;
  exp: number;
  sub: string;
  tId: string;
  rsub: string;
  sessionHandle: string; // unique id for session also used as the socketId
  refreshTokenHash1: string | null;
  parentRefreshTokenHash1: string | null;
  antiCsrfToken: string | null;
  iss: string;
}
