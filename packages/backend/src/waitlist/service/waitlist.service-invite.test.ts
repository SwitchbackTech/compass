import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { ENV } from "@backend/common/constants/env.constants";
import WaitlistService from "@backend/waitlist/service/waitlist.service";
import { answer } from "@backend/waitlist/service/waitlist.service.test-setup";

describe("isInvited", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

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
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should invite email to waitlist", async () => {
    // Arrange
    await WaitlistService.addToWaitlist(answer.email, answer);

    // Act
    const result = await WaitlistService.invite(answer.email);

    console.log(result);

    // Assert
    expect(result.status).toBe("invited");
  });

  it("should ignore if email is not on waitlist", async () => {
    // Act
    const result = await WaitlistService.invite(answer.email);

    // Assert
    expect(result.status).toBe("ignored");
  });

  it("should add tag to subscriber when inviting", async () => {
    await WaitlistService.addToWaitlist(answer.email, answer);
    const EmailService = require("../../email/email.service").default;
    const spy = jest.spyOn(EmailService, "addTagToSubscriber");
    const result = await WaitlistService.invite(answer.email);
    expect(spy).toHaveBeenCalled();
    expect(result.tagResponse).toBeDefined();
  });

  it("should skip tagging if EMAILER env vars missing", async () => {
    const oldSecret = ENV.EMAILER_SECRET;
    const oldInviteTag = ENV.EMAILER_WAITLIST_INVITE_TAG_ID;
    const oldWaitlistTag = ENV.EMAILER_WAITLIST_TAG_ID;
    ENV.EMAILER_SECRET = undefined as any;
    ENV.EMAILER_WAITLIST_INVITE_TAG_ID = undefined as any;
    ENV.EMAILER_WAITLIST_TAG_ID = undefined as any;

    const EmailService = require("../../email/email.service").default;
    const spy = jest.spyOn(EmailService, "addTagToSubscriber");
    spy.mockClear();

    await WaitlistService.addToWaitlist(answer.email, answer);
    const result = await WaitlistService.invite(answer.email);

    expect(spy).not.toHaveBeenCalled();
    expect(result.tagResponse).toBeUndefined();

    ENV.EMAILER_SECRET = oldSecret;
    ENV.EMAILER_WAITLIST_INVITE_TAG_ID = oldInviteTag;
    ENV.EMAILER_WAITLIST_TAG_ID = oldWaitlistTag;
  });
});
