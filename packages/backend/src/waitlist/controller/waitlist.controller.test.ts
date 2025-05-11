import { Express } from "express";
import request from "supertest";
import { Answers_v0 } from "../types/waitlist.types";

describe("POST /api/waitlist", () => {
  let app: Express | undefined;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    app = undefined;
  });

  it("should return 500 if emailer values are missing", async () => {
    jest.doMock("@backend/common/constants/env.constants", () => ({
      ENV: {},
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    app = express();
    app.use(express.json());
    app.post("/api/waitlist", WaitlistController.addToWaitlist);

    const answers: Answers_v0 = {
      source: "other",
      firstName: "Jo",
      lastName: "Schmo",
      email: "test@example.com",
      currentlyPayingFor: [],
      howClearAboutValues: "not-clear",
      workingTowardsMainGoal: "yes",
      isWillingToShare: false,
    };
    const res = await request(app).post("/api/waitlist").send(answers);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Emailer values are missing");
  });

  it("should return 400 if answers are invalid", async () => {
    jest.doMock("@backend/common/constants/env.constants", () => ({
      ENV: { EMAILER_LIST_ID: "foo", EMAILER_SECRET: "bar" },
    }));
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        addToWaitlist: jest.fn(),
      },
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    app = express();
    app.use(express.json());
    app.post("/api/waitlist", WaitlistController.addToWaitlist);

    const res = await request(app)
      .post("/api/waitlist")
      .send({ email: "", name: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("should return 200 if answers are valid", async () => {
    jest.doMock("@backend/common/constants/env.constants", () => ({
      ENV: { EMAILER_LIST_ID: "foo", EMAILER_SECRET: "bar" },
    }));
    jest.doMock("../service/waitlist.service", () => ({
      __esModule: true,
      default: {
        addToWaitlist: jest.fn().mockResolvedValue(undefined),
      },
    }));
    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    app = express();
    app.use(express.json());
    app.post("/api/waitlist", WaitlistController.addToWaitlist);

    const answers: Answers_v0 = {
      source: "social-media",
      firstName: "Jo",
      lastName: "Schmo",
      email: "test@example.com",
      currentlyPayingFor: [],
      howClearAboutValues: "not-clear",
      workingTowardsMainGoal: "yes",
      isWillingToShare: false,
    };
    const res = await request(app).post("/api/waitlist").send(answers);

    expect(res.status).toBe(200);
    expect(res.body.error).not.toBeDefined();
  });
});
