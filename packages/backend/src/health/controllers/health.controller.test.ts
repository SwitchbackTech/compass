import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import {
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { Status } from "@core/errors/status.codes";

describe("HealthController", () => {
  const baseDriver = new BaseDriver();

  beforeAll(setupTestDb);
  afterAll(cleanupTestDb);

  describe("check", () => {
    it("should return 200 OK with status ok and timestamp", async () => {
      const response = await baseDriver
        .getServer()
        .get("/api/health")
        .expect(Status.OK);

      expect(response.body).toEqual({
        status: "ok",
        timestamp: expect.any(String),
      });

      // Verify timestamp is a valid ISO string
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it("should return a recent timestamp", async () => {
      const beforeRequest = new Date();
      const response = await baseDriver
        .getServer()
        .get("/api/health")
        .expect(Status.OK);
      const afterRequest = new Date();

      const responseTimestamp = new Date(response.body.timestamp);

      // Timestamp should be between before and after request time
      expect(responseTimestamp.getTime()).toBeGreaterThanOrEqual(
        beforeRequest.getTime() - 1000, // Allow 1 second tolerance
      );
      expect(responseTimestamp.getTime()).toBeLessThanOrEqual(
        afterRequest.getTime() + 1000, // Allow 1 second tolerance
      );
    });

    it("should not require authentication", async () => {
      // Health endpoint should be accessible without session
      const response = await baseDriver
        .getServer()
        .get("/api/health")
        .expect(Status.OK);

      expect(response.body.status).toBe("ok");
    });

    it("should be accessible even with invalid session", async () => {
      // Health endpoint should work regardless of session validity
      const response = await baseDriver
        .getServer()
        .get("/api/health")
        .set("Cookie", "session=invalid")
        .expect(Status.OK);

      expect(response.body.status).toBe("ok");
    });

    it("should verify database connectivity", async () => {
      // When database is connected, endpoint should return successfully
      const response = await baseDriver
        .getServer()
        .get("/api/health")
        .expect(Status.OK);

      expect(response.body).toEqual({
        status: "ok",
        timestamp: expect.any(String),
      });
    });

    it("should return 500 when database connectivity check fails", async () => {
      const pingSpy = jest
        .spyOn(Object.getPrototypeOf(mongoService.db.admin()), "ping")
        .mockRejectedValue(new Error("database unavailable"));

      try {
        const response = await baseDriver
          .getServer()
          .get("/api/health")
          .expect(Status.INTERNAL_SERVER);

        expect(response.body).toEqual({
          status: "error",
          timestamp: expect.any(String),
        });
      } finally {
        pingSpy.mockRestore();
      }
    });

    it("should return consistent response structure", async () => {
      const response = await baseDriver
        .getServer()
        .get("/api/health")
        .expect(Status.OK);

      // Verify response has exactly the expected fields
      expect(Object.keys(response.body)).toEqual(["status", "timestamp"]);
      expect(typeof response.body.status).toBe("string");
      expect(typeof response.body.timestamp).toBe("string");
      expect(response.body.status).toBe("ok");
    });

    it("should handle multiple concurrent requests", async () => {
      // Use fewer concurrent requests to avoid connection issues
      const requests = Array.from({ length: 3 }, () =>
        baseDriver
          .getServer()
          .get("/api/health")
          .expect(Status.OK)
          .catch((error) => {
            // Retry once on connection error
            return baseDriver.getServer().get("/api/health").expect(Status.OK);
          }),
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.body.status).toBe("ok");
        expect(response.body.timestamp).toBeDefined();
      });

      // Timestamps should be close to each other (within same second)
      const timestamps = responses.map((r) => new Date(r.body.timestamp));
      const minTime = Math.min(...timestamps.map((t) => t.getTime()));
      const maxTime = Math.max(...timestamps.map((t) => t.getTime()));
      expect(maxTime - minTime).toBeLessThan(2000); // Within 2 seconds
    });

    it("should return proper content-type header", async () => {
      const response = await baseDriver
        .getServer()
        .get("/api/health")
        .expect(Status.OK);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });
  });
});
