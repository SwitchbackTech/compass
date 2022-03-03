import { CombinedLogin_Google } from "@core/types/auth.types";
import { Schema_Oauth } from "@core/types/auth.types";
declare class CompassAuthService {
  loginToCompass(loginData: CombinedLogin_Google): Promise<Schema_Oauth>;
  updateOauthId(
    userId: string,
    userData: CombinedLogin_Google
  ): Promise<Schema_Oauth>;
}
export default CompassAuthService;
//# sourceMappingURL=compass.auth.service.d.ts.map
