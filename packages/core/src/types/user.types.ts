import { DeleteResult } from "mongodb";

export interface Schema_User {
  // TODO either create new interface with _id or make optional ?
  // _id?: string;
  email: string;
  name: string;
  picture: string;
  googleId: string;
}

export interface Result_Delete_User {
  events: DeleteResult;
  oauth: DeleteResult;
  user: DeleteResult;
  errors: object[] | [];
}
