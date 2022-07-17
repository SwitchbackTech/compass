import { Credentials } from "google-auth-library";
import { DeleteResult, ObjectId } from "mongodb";

export interface Schema_User extends Schema_User_Base {
  _id: ObjectId;
}
export interface Schema_User_Base {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  locale: string;
  picture: string;
  tokens: Credentials;
  // tokens: {
  // refresh_token: string;
  // }
}

//--
export interface Result_Delete_User {
  events: DeleteResult;
  oauth: DeleteResult;
  user: DeleteResult;
  errors: object[] | [];
}
