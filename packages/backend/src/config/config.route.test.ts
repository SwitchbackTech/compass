import { Status } from "@core/errors/status.codes";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { CONFIG } from "@backend/common/constants/config.constants";
import { describe, expect, it } from "bun:test";

describe("GET /api/config", () => {
  const baseDriver = new BaseDriver();

  it("returns Google availability from backend configuration", async () => {
    const originalClientId = CONFIG.GOOGLE_CLIENT_ID;
    const originalClientSecret = CONFIG.GOOGLE_CLIENT_SECRET;
    CONFIG.GOOGLE_CLIENT_ID = undefined;
    CONFIG.GOOGLE_CLIENT_SECRET = undefined;

    try {
      const response = await baseDriver
        .getServer()
        .get("/api/config")
        .expect(Status.OK);

      expect(response.body).toEqual({
        google: {
          isConfigured: false,
        },
        sync: {
          cloudMutationMode: "enabled",
          execution: "passive",
        },
      });
    } finally {
      CONFIG.GOOGLE_CLIENT_ID = originalClientId;
      CONFIG.GOOGLE_CLIENT_SECRET = originalClientSecret;
    }
  });

  it("reports Google unavailable when credentials are absent", async () => {
    const originalClientId = CONFIG.GOOGLE_CLIENT_ID;
    const originalClientSecret = CONFIG.GOOGLE_CLIENT_SECRET;
    CONFIG.GOOGLE_CLIENT_ID = undefined;
    CONFIG.GOOGLE_CLIENT_SECRET = undefined;

    try {
      const response = await baseDriver
        .getServer()
        .get("/api/config")
        .expect(Status.OK);

      expect(response.body).toEqual({
        google: {
          isConfigured: false,
        },
        sync: {
          cloudMutationMode: "enabled",
          execution: "passive",
        },
      });
    } finally {
      CONFIG.GOOGLE_CLIENT_ID = originalClientId;
      CONFIG.GOOGLE_CLIENT_SECRET = originalClientSecret;
    }
  });

  it("exposes Sync cutover posture", async () => {
    const response = await baseDriver
      .getServer()
      .get("/api/config")
      .expect(Status.OK);

    expect(response.body.sync).toEqual({
      cloudMutationMode: "enabled",
      execution: "passive",
    });
  });
});
