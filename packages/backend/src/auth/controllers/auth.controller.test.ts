import { ObjectId, WithId } from "mongodb";
import { gCalendar } from "@core/types/gcal";
import { Schema_User } from "@core/types/user.types";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";
import userService from "@backend/user/services/user.service";
import authController from "./auth.controller";

jest.mock("@backend/sync/services/sync.service");
jest.mock("@backend/user/services/user.service");
jest.mock("@backend/common/services/mongo.service", () => ({
  user: {
    findOneAndUpdate: jest.fn(),
  },
}));

describe("AuthController", () => {
  describe("login", () => {
    const mockUser: WithId<Schema_User> = {
      _id: new ObjectId(),
      google: {
        gRefreshToken: "old-token",
      },
    } as WithId<Schema_User>;

    const mockGcal = {} as gCalendar;
    const mockNewRefreshToken = "new-token";

    beforeEach(() => {
      jest.clearAllMocks();
      // Mock mongoService
      (mongoService.user.findOneAndUpdate as jest.Mock).mockResolvedValue({
        value: mockUser,
      });
    });

    it("should resync google data when NoSyncToken error occurs", async () => {
      // Mock syncService to throw NoSyncToken error
      (syncService.importIncremental as jest.Mock).mockRejectedValue(
        new Error(SyncError.NoSyncToken.description),
      );

      // Mock userService methods
      (userService.reSyncGoogleData as jest.Mock).mockResolvedValue(undefined);
      (userService.saveTimeFor as jest.Mock).mockResolvedValue(undefined);

      const { cUserId } = await authController.login(
        mockUser,
        mockGcal,
        mockNewRefreshToken,
      );

      // Verify reSyncGoogleData was called
      expect(userService.reSyncGoogleData).toHaveBeenCalledWith(
        mockUser._id.toString(),
      );

      // Verify it still returns the user id after resyncing
      expect(cUserId).toBe(mockUser._id.toString());
    });
  });
});
