import { initExpressServer } from "@backend/servers/express/express.server";
import { describe, expect, it } from "bun:test";

describe("initExpressServer", () => {
  it("trusts one proxy hop so Caddy X-Forwarded-For does not collapse rate-limit keys", () => {
    const app = initExpressServer();
    expect(app.get("trust proxy")).toBe(1);
  });
});
