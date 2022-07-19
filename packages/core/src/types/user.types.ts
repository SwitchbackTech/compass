import { Credentials } from "google-auth-library";
import { DeleteResult, ObjectId } from "mongodb";

export interface Schema_User extends Schema_User_Base {
  _id: ObjectId;
}
export interface Schema_User_Base {
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  locale: string;
  google: {
    googleId: string;
    picture: string;
    refreshToken: string;
    // tokens: Credentials;
  };
}

//--
export interface Result_Delete_User {
  events: DeleteResult;
  oauth: DeleteResult;
  user: DeleteResult;
  errors: object[] | [];
}
