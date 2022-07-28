import Session from "supertokens-node/recipe/session";
import { UserInfo_Compass } from "@core/types/auth.types";

class CompassAuthService {
  createUserSession = (userInfo: UserInfo_Compass) => {
    return { foo: 1 };
  };

  revokeSessionsByUser = async (userId: string) => {
    const sessionsRevoked = await Session.revokeAllSessionsForUser(userId);
    return { sessionsRevoked: sessionsRevoked.length };
  };
}

export default new CompassAuthService();
