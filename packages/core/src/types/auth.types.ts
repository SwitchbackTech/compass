import { Credentials, TokenPayload } from "google-auth-library";
import type { User } from "supertokens-node";

export interface Result_Auth_Compass {
  status: "OK";
  createdNewRecipeUser: boolean;
  user: User;
}

export interface UserInfo_Google {
  gUser: TokenPayload;
  tokens: Credentials;
}
