import { BaseError } from "@core/errors/errors.base";
import { Credentials, TokenPayload } from "google-auth-library";

export interface Result_Auth_Compass {
  cUserId?: string;
  error?: BaseError;
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

export interface UserInfo_Compass {
  cUserId?: string;
  email?: string;
}
export interface UserInfo_Google {
  gUser: TokenPayload;
  tokens: Credentials;
}
