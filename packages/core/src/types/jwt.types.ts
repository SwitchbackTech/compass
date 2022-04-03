export type JwtToken = { _id: string; exp: number; iat: number };
export interface Result_Token_Validate {
  payload?: JwtToken;
  refreshNeeded: boolean;
  error?: unknown;
}
