import { Status } from "@core/errors/status.codes";
import { session } from "@web/common/classes/Session";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";
import { getUserId } from "./session.util";

jest.mock("@web/common/classes/Session");

describe("session.util", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
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

    it("returns unauthenticated user for expected session auth errors", async () => {
      (session.doesSessionExist as jest.Mock).mockRejectedValue(
        {
          response: {
            status: Status.UNAUTHORIZED,
          },
        } as never,
      );

      const userId = await getUserId();

      expect(userId).toBe(UNAUTHENTICATED_USER);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("returns unauthenticated user and logs unexpected session errors", async () => {
      (session.doesSessionExist as jest.Mock).mockRejectedValue(
        new Error("Session check failed"),
      );

      const userId = await getUserId();

      expect(userId).toBe(UNAUTHENTICATED_USER);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to resolve user id from session:",
        expect.any(Error),
      );
    });
  });
});
