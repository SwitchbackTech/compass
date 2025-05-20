import request from "supertest";

describe("GET /api/invited", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("should return 400 if email is invalid", async () => {
    // Arrange
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        isInvited: jest.fn(),
      },
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.get("/api/invited", WaitlistController.isInvited);

    // Act
    const res = await request(app).get("/api/invited").query({ email: "" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.error).toBeDefined();
  });

  it("should return true if email was invited", async () => {
    // Arrange
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        isInvited: jest.fn().mockResolvedValue(true), // user is invited
      },
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.get("/api/invited", WaitlistController.isInvited);

    // Act
    const res = await request(app)
      .get("/api/invited")
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
      },
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.get("/api/invited", WaitlistController.isInvited);

    // Act
    const res = await request(app)
      .get("/api/invited")
      .query({ email: "not-invited@bar.com" });

    // Assert
    expect(res.status).toBe(200);
    const data = res.body;
    expect(data.isInvited).toBeDefined();
    expect(data.isInvited).toBe(false);
  });
});
