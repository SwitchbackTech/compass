import { Result_Delete_User } from "@core/types/user.types";
import { CombinedLogin_Google } from "@core/types/auth.types";
import { BaseError } from "@core/errors/errors.base";
declare class UserService {
  createUser: (userData: CombinedLogin_Google) => Promise<string>;
  deleteUserData(userId: string): Promise<Result_Delete_User | BaseError>;
}
declare const _default: UserService;
export default _default;
//# sourceMappingURL=user.service.d.ts.map
