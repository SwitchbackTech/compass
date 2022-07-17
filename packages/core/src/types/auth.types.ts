import { Credentials, TokenPayload } from "google-auth-library";

export interface Result_Auth_Compass {
  error: Error | null;
  accessToken: string | null;
}
export interface Result_OauthStatus {
  isOauthComplete: boolean;
  refreshNeeded?: boolean;
  token?: string;
}

export interface Result_OauthUrl {
  authUrl: string;
  authState: string;
}

export interface Result_User_Init {
  accessToken: string;
  nextAction: "login" | "signup";
}

export interface User_Google {
  id: string;
  email: string;
  family_name: string;
  given_name: string;
  locale: string;
  name: string;
  picture: string;
  verified_email: boolean;
  tokens: Credentials;
}
export interface UserInfo_Google {
  gUser: TokenPayload;
  tokens: Credentials;
}

//-- old stuff
export interface CombinedLogin_GoogleOLD {
  user: User_Google;
  oauth: {
    state: string;
    tokens: Credentials;
  };
}

export interface Params_AfterOAuth {
  //--
  state: string;
  code: string;
}
export interface Schema_Oauth {
  //--
  _id?: string;
  user: string;
  state: string;
  tokens: Credentials;
}
