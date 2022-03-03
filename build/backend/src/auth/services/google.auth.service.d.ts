import express from "express";
import { Credentials, OAuth2Client } from "google-auth-library";
import { Result_OauthStatus } from "@core/types/auth.types";
import { BaseError } from "@core/errors/errors.base";
import { gCalendar } from "@core/types/gcal";
/********
Helpers
********/
export declare const getGcal: (userId: string) => Promise<gCalendar>;
declare class GoogleOauthService {
  tokens: {};
  oauthClient: OAuth2Client;
  constructor();
  checkOauthStatus(req: express.Request): Promise<Result_OauthStatus>;
  generateAuthUrl(state: string): string;
  getUser(): Promise<
    BaseError | import("googleapis").oauth2_v2.Schema$Userinfo
  >;
  getTokens(): {};
  setTokens(code: string, tokens: Credentials | null): Promise<void>;
}
export default GoogleOauthService;
//# sourceMappingURL=google.auth.service.d.ts.map
