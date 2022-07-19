import { Credentials, TokenPayload } from "google-auth-library";

export interface Result_Auth_Compass {
  accessToken?: string | null;
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
