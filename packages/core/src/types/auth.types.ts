import { Credentials } from "google-auth-library";

export interface OAuthDTO {
  _id?: string;
  user: string;
  state: string;
  tokens: OAuthTokens_Gcal;
}

export interface Params_AfterOAuth {
  state: string;
  code: string;
}

export interface OAuthTokens_Gcal extends Credentials {
  // from event service
  nextSyncToken?: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}
export interface CombinedLogin_Google {
  user: GoogleUser;
  oauth: {
    state: string;
    tokens: OAuthTokens_Gcal;
  };
}
