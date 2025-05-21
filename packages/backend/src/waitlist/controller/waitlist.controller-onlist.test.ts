import request from "supertest";

describe("GET /api/waitlist", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("should return 400 if email is invalid", async () => {
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
    app.get("/api/waitlist", WaitlistController.isInvited);

    const res = await request(app).get("/api/waitlist").query({ email: "" });

    expect(res.status).toBe(400);
    expect(res.error).toBeDefined();
  });

  it("should return true if email is on waitlist", async () => {
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        isInvited: jest.fn().mockResolvedValue(true),
      },
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.get("/api/waitlist", WaitlistController.isInvited);

    const res = await request(app)
      .get("/api/waitlist")
      .query({ email: "waitlisted@bar.com" });

    expect(res.status).toBe(200);
    const data = res.body;
    expect(data.isInvited).toBeDefined();
    expect(data.isInvited).toBe(true);
  });

  it("should return false if email is not on waitlist", async () => {
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        isInvited: jest.fn().mockResolvedValue(false),
      },
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.get("/api/waitlist", WaitlistController.isInvited);

    const res = await request(app)
      .get("/api/waitlist")
      .query({ email: "nope@bar.com" });

    expect(res.status).toBe(200);
    const data = res.body;
    expect(data.isInvited).toBeDefined();
    expect(data.isInvited).toBe(false);
  });
});
