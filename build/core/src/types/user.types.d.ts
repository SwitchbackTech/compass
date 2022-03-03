import { DeleteResult } from "mongodb";
export interface Schema_User {
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
//# sourceMappingURL=user.types.d.ts.map
