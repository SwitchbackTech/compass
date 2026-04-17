import { describe, expect, it, mock, beforeEach } from "bun:test";
import { afterAll } from "bun:test";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";
import { getUserId } from "./session.util";

const mockDoesSessionExist = mock();
const mockGetAccessTokenPayloadSecurely = mock();

mock.module("@web/common/classes/Session", () => ({
  session: {
    doesSessionExist: mockDoesSessionExist,
    getAccessTokenPayloadSecurely: mockGetAccessTokenPayloadSecurely,
  },
}));

describe("session.util", () => {
  beforeEach(() => {
    mockDoesSessionExist.mockClear();
    mockGetAccessTokenPayloadSecurely.mockClear();
  });

  describe("getUserId", () => {
    it("should return UNAUTHENTICATED_USER when session does not exist", async () => {
      mockDoesSessionExist.mockResolvedValue(false);

      const userId = await getUserId();

      expect(userId).toBe(UNAUTHENTICATED_USER);
      expect(mockDoesSessionExist).toHaveBeenCalledTimes(1);
      expect(mockGetAccessTokenPayloadSecurely).not.toHaveBeenCalled();
    });

    it("should return actual userId when session exists", async () => {
      const mockUserId = "authenticated-user-id";
      mockDoesSessionExist.mockResolvedValue(true);
      mockGetAccessTokenPayloadSecurely.mockResolvedValue({
        sub: mockUserId,
      });

      const userId = await getUserId();

      expect(userId).toBe(mockUserId);
      expect(mockDoesSessionExist).toHaveBeenCalledTimes(1);
      expect(mockGetAccessTokenPayloadSecurely).toHaveBeenCalledTimes(1);
    });
  });
});

afterAll(() => {
  mock.restore();
});
