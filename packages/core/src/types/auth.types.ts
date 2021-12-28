import { Credentials } from "google-auth-library";

export interface Schema_Oauth {
  _id?: string;
  user: string;
  state: string;
  tokens: Credentials;
}

export interface Params_AfterOAuth {
  state: string;
  code: string;
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
    tokens: Credentials;
  };
}
