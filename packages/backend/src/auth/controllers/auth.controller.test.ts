import { Status } from "@core/errors/status.codes";
import { CONFIG } from "@backend/common/constants/config.constants";
import authController from "./auth.controller";
import { afterEach, describe, expect, it, mock } from "bun:test";

describe("auth.controller", () => {
  describe("beginGoogleConnection", () => {
    const originalMutationMode = CONFIG.SYNC_CLOUD_MUTATION_MODE;

    afterEach(() => {
      CONFIG.SYNC_CLOUD_MUTATION_MODE = originalMutationMode;
    });

    it("rejects connect begin with typed MAINTENANCE during cutover", () => {
      CONFIG.SYNC_CLOUD_MUTATION_MODE = "maintenance";
      const status = mock().mockReturnThis();
      const json = mock();
      const promise = mock();

      authController.beginGoogleConnection(
        {
          body: {},
          session: { getUserId: () => "507f1f77bcf86cd799439011" },
        } as never,
        { status, json, promise } as never,
      );

      expect(promise).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(Status.SERVICE_UNAVAILABLE);
      expect(json).toHaveBeenCalledWith({
        code: "MAINTENANCE",
        message: "Cloud edits are paused for maintenance",
        retryable: true,
      });
    });
  });
});
