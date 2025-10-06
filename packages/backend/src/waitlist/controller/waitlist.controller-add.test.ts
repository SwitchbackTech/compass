import request from "supertest";
import type { Answers_v1 } from "@core/types/waitlist/waitlist.answer.types";

describe("POST /api/waitlist", () => {
  beforeEach(() => jest.resetModules());
  it("should return 400 if answers are invalid", async () => {
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        addToWaitlist: jest.fn(),
      },
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.post("/api/waitlist", WaitlistController.addToWaitlist);

    const res = await request(app)
      .post("/api/waitlist")
      .send({ email: "", name: "" });

    expect(res.status).toBe(400);
    expect(res.error).toBeDefined();
  });

  it("should return 200 if answers are valid", async () => {
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        addToWaitlist: jest.fn().mockResolvedValue(undefined),
      },
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.post("/api/waitlist", WaitlistController.addToWaitlist);

    const answers: Answers_v1 = {
      email: "test@example.com",
      schemaVersion: "1",
      source: "social-media",
      firstName: "Jo",
      lastName: "Schmo",
      profession: "Founder",
      currentlyPayingFor: [],
      anythingElse: "I'm a test",
    };
    const res = await request(app).post("/api/waitlist").send(answers);

    expect(res.status).toBe(200);
    expect(res.body.error).not.toBeDefined();
  });
  // this test is at the bottom to avoid
  // having to reset ENV in each test
  it("should return 500 if emailer values are missing", async () => {
    jest.doMock("@backend/common/constants/env.constants", () => ({
      ENV: {},
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const app = express();
    app.use(express.json());
    app.post("/api/waitlist", WaitlistController.addToWaitlist);

    const answers: Answers_v1 = {
      email: "test@example.com",
      schemaVersion: "1",
      source: "other",
      firstName: "Jo",
      lastName: "Schmo",
      currentlyPayingFor: [],
      profession: "Founder",
    };
    const res = await request(app).post("/api/waitlist").send(answers);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Missing emailer value(s)");
  });
});
