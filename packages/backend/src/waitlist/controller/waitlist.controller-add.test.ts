import type { Express } from "express";
import request from "supertest";
import type {
  Answers_v1,
  Answers_v2,
} from "@core/types/waitlist/waitlist.answer.types";

describe("POST /api/waitlist", () => {
  let app: Express;
  let mockAddToWaitlist: jest.Mock;

  const createTestApp = async (mocks?: {
    env?: Record<string, unknown>;
    service?: Record<string, unknown>;
  }) => {
    if (mocks?.env) {
      jest.doMock("@backend/common/constants/env.constants", () => mocks.env);
    }
    if (mocks?.service) {
      jest.doMock("../service/waitlist.service", () => mocks.service);
    }

    const { WaitlistController } = await import("./waitlist.controller");
    const express = (await import("express")).default;
    const testApp = express();
    testApp.use(express.json());
    testApp.post("/api/waitlist", WaitlistController.addToWaitlist);
    return testApp;
  };

  beforeEach(() => {
    jest.resetModules();
    mockAddToWaitlist = jest.fn();
  });

  it("should return 400 if answers are invalid", async () => {
    app = await createTestApp({
      service: {
        __esModule: true,
        default: { addToWaitlist: mockAddToWaitlist },
      },
    });

    const res = await request(app)
      .post("/api/waitlist")
      .send({ email: "", name: "" });

    expect(res.status).toBe(400);
    expect(res.error).toBeDefined();
    expect(mockAddToWaitlist).not.toHaveBeenCalled();
  });

  it("should return 400 if schema version is missing", async () => {
    app = await createTestApp({
      service: {
        __esModule: true,
        default: { addToWaitlist: mockAddToWaitlist },
      },
    });

    const res = await request(app)
      .post("/api/waitlist")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(400);
    expect(res.error).toBeDefined();
    expect(mockAddToWaitlist).not.toHaveBeenCalled();
  });

  it("should return 200 if v1 answers are valid", async () => {
    mockAddToWaitlist.mockResolvedValue(undefined);
    app = await createTestApp({
      service: {
        __esModule: true,
        default: { addToWaitlist: mockAddToWaitlist },
      },
    });

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
    expect(mockAddToWaitlist).toHaveBeenCalledWith(answers.email, answers);
  });

  it("should return 200 if v2 answers are valid", async () => {
    mockAddToWaitlist.mockResolvedValue(undefined);
    app = await createTestApp({
      service: {
        __esModule: true,
        default: { addToWaitlist: mockAddToWaitlist },
      },
    });

    const answers: Answers_v2 = {
      email: "test@example.com",
      schemaVersion: "2",
    };

    const res = await request(app).post("/api/waitlist").send(answers);

    expect(res.status).toBe(200);
    expect(res.body.error).not.toBeDefined();
    expect(mockAddToWaitlist).toHaveBeenCalledWith(answers.email, answers);
  });

  it("should return 500 if emailer values are missing", async () => {
    app = await createTestApp({
      env: { ENV: {} },
      service: {
        __esModule: true,
        default: { addToWaitlist: mockAddToWaitlist },
      },
    });

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
    expect(res.body.error).toBe(
      "Missing required emailer configuration: EMAILER_SECRET or EMAILER_WAITLIST_TAG_ID",
    );
  });
});
