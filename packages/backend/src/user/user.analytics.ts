import { captureSafely } from "@core/logger/posthog-capture";
import { CONFIG } from "@backend/common/constants/config.constants";
import { getBackendPostHogClient } from "@backend/common/helpers/backend-posthog-client";

export type UserServerEvent = "account_deleted";

export const userAnalytics = {
  capture(input: {
    event: UserServerEvent;
    userId: string;
    properties?: Record<string, boolean | number | string>;
  }): Promise<boolean> {
    return captureSafely(getBackendPostHogClient(), {
      event: input.event,
      distinctId: input.userId,
      properties: {
        environment: CONFIG.NODE_ENV,
        ...input.properties,
      },
    });
  },
};
