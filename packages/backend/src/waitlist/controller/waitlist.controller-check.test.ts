import request from "supertest";

describe("GET /api/waitlist", () => {
  beforeEach(() => jest.resetModules());
  it("should return 400 if email is invalid", async () => {
    // Arrange
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        isInvited: jest.fn(),
        isOnWaitlist: jest.fn(),
      },
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.get("/api/waitlist", WaitlistController.status);

    // Act
    const res = await request(app).get("/api/waitlist").query({ email: "" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      isOnWaitlist: false,
      isInvited: false,
      isActive: false,
    });
  });

  it("should return true if email was invited", async () => {
    // Arrange
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        isInvited: jest.fn().mockResolvedValue(true), // user is invited
        isOnWaitlist: jest.fn().mockResolvedValue(true), // user is waitlisted
      },
    }));
    jest.doMock("../../user/queries/user.queries", () => ({
      __esModule: true,
      findCompassUserBy: jest.fn().mockResolvedValue(null), // Simulate user not found, so isActive will be false
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.get("/api/waitlist", WaitlistController.status);

    // Act
    const res = await request(app)
      .get("/api/waitlist")
      .query({ email: "was-invited@bar.com" });

    // Assert
    expect(res.status).toBe(200);
    const data = res.body;
    expect(data.isInvited).toBeDefined();
    expect(data.isInvited).toBe(true);
  });

  it("should return false if email was not invited", async () => {
    // Arrange
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        isInvited: jest.fn().mockResolvedValue(false), // user is not invited
        isOnWaitlist: jest.fn().mockResolvedValue(false), // user is not waitlisted
      },
    }));
    jest.doMock("../../user/queries/user.queries", () => ({
      __esModule: true,
      findCompassUserBy: jest.fn().mockResolvedValue(null), // Simulate user not found, so isActive will be false
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.get("/api/waitlist", WaitlistController.status);

    // Act
    const res = await request(app)
      .get("/api/waitlist")
      .query({ email: "not-invited@bar.com" });

    // Assert
    expect(res.status).toBe(200);
    const data = res.body;
    expect(data.isInvited).toBeDefined();
    expect(data.isInvited).toBe(false);
    expect(data.isOnWaitlist).toBe(false);
    expect(data.isActive).toBe(false);
  });
});
