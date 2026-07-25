import { Status } from "@core/errors/status.codes";
import { CONFIG } from "@backend/common/constants/config.constants";
import {
  assertCloudMutationsAllowed,
  getCloudMutationMode,
  isCloudMutationEnabled,
} from "@backend/common/services/sync-service/cloud-mutation-mode";
import {
  EventMutationException,
  toEventMutationError,
} from "@backend/event/event.error";
import { afterEach, describe, expect, it } from "bun:test";

describe("cloud-mutation-mode", () => {
  const originalMode = CONFIG.SYNC_CLOUD_MUTATION_MODE;

  afterEach(() => {
    CONFIG.SYNC_CLOUD_MUTATION_MODE = originalMode;
  });

  it("reports enabled by default in the test config", () => {
    CONFIG.SYNC_CLOUD_MUTATION_MODE = "enabled";

    expect(getCloudMutationMode()).toBe("enabled");
    expect(isCloudMutationEnabled()).toBe(true);
    expect(() => assertCloudMutationsAllowed()).not.toThrow();
  });

  it("throws a typed MAINTENANCE error when paused", () => {
    CONFIG.SYNC_CLOUD_MUTATION_MODE = "maintenance";

    expect(getCloudMutationMode()).toBe("maintenance");
    expect(isCloudMutationEnabled()).toBe(false);

    try {
      assertCloudMutationsAllowed();
      throw new Error("expected assertCloudMutationsAllowed to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(EventMutationException);
      const { status, body } = toEventMutationError(error);
      expect(status).toBe(Status.SERVICE_UNAVAILABLE);
      expect(body).toEqual({
        code: "MAINTENANCE",
        message: "Cloud edits are paused for maintenance",
        retryable: true,
      });
    }
  });
});
