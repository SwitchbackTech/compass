import { session } from "@web/common/classes/Session";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";
import { getUserId } from "./auth.util";

jest.mock("@web/common/classes/Session");

describe("auth.util", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserId", () => {
    it("should return UNAUTHENTICATED_USER when session does not exist", async () => {
      (session.doesSessionExist as jest.Mock).mockResolvedValue(false);

      const userId = await getUserId();

      expect(userId).toBe(UNAUTHENTICATED_USER);
      expect(session.doesSessionExist).toHaveBeenCalledTimes(1);
      expect(session.getAccessTokenPayloadSecurely).not.toHaveBeenCalled();
    });

    it("should return actual userId when session exists", async () => {
      const mockUserId = "authenticated-user-id";
      (session.doesSessionExist as jest.Mock).mockResolvedValue(true);
      (session.getAccessTokenPayloadSecurely as jest.Mock).mockResolvedValue({
        sub: mockUserId,
      });

      const userId = await getUserId();

      expect(userId).toBe(mockUserId);
      expect(session.doesSessionExist).toHaveBeenCalledTimes(1);
      expect(session.getAccessTokenPayloadSecurely).toHaveBeenCalledTimes(1);
    });

    it("should handle session check errors gracefully", async () => {
      (session.doesSessionExist as jest.Mock).mockRejectedValue(
        new Error("Session check failed"),
      );

      await expect(getUserId()).rejects.toThrow("Session check failed");
    });
  });
});
