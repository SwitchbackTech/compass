import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import WaitlistService from "./waitlist.service";
import { answer } from "./waitlist.service.test-setup";

describe("isInvited", () => {
  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();
  });

  beforeEach(async () => {
    await cleanupCollections(setup.db);
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });

  it("should return false if email is not invited", async () => {
    // simulates when user was waitlisted but not invited
    const result = await WaitlistService.isInvited(answer.email);
    expect(result).toBe(false);
  });

  it("should return true if email is invited", async () => {
    // Arrange
    await WaitlistService.addToWaitlist(answer.email, answer);
    await WaitlistService.invite(answer.email);

    // Act
    const result = await WaitlistService.isInvited(answer.email);

    // Assert
    expect(result).toBe(true);
  });
});

describe("invite", () => {
  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();
  });

  beforeEach(async () => {
    await cleanupCollections(setup.db);
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });

  it("should invite email to waitlist", async () => {
    // Arrange
    await WaitlistService.addToWaitlist(answer.email, answer);

    // Act
    const result = await WaitlistService.invite(answer.email);

    // Assert
    expect(result.status).toBe("invited");
  });

  it("should ignore if email is not on waitlist", async () => {
    // Act
    const result = await WaitlistService.invite(answer.email);

    // Assert
    expect(result.status).toBe("ignored");
  });
});
