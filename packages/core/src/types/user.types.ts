import { DeleteResult } from "mongodb";

export interface CompassUser {
  // TODO either create new interface with _id or make optional ?
  // _id?: string;
  email: string;
  name: string;
  picture: string;
  googleId: string;
}

export interface DeleteUserDataResult {
  events: DeleteResult;
  oauth: DeleteResult;
  user: DeleteResult;
  errors: object[] | [];
}
