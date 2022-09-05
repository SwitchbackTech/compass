// import { ObjectId } from "mongodb";

// export interface Schema_User extends Schema_User_Base {
//   _id: ObjectId;
// }
export interface Schema_User {
  // _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  locale: string;
  google: {
    googleId: string;
    picture: string;
    gRefreshToken: string;
  };
  signedUpAt?: Date;
  lastLoggedInAt?: Date;
}
