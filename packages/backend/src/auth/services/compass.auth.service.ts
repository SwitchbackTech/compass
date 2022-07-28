import Session from "supertokens-node/recipe/session";

class CompassAuthService {
  revokeSessionsByUser = async (userId: string) => {
    const sessionsRevoked = await Session.revokeAllSessionsForUser(userId);
    return { sessionsRevoked: sessionsRevoked.length };
  };
}

export default new CompassAuthService();
