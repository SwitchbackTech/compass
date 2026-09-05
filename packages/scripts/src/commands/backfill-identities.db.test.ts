import { backfillIdentities } from "@scripts/commands/backfill-identities/backfill";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";

const NOW = new Date("2026-09-05T12:00:00.000Z");
const SIGNED_UP = new Date("2026-01-15T00:00:00.000Z");

describe("backfill-identities (db)", () => {
  beforeAll(() => setupTestDb(import.meta.url));
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("dry-run reports matches without writing", async () => {
    await mongoService.user.insertOne({
      email: "legacy@example.com",
      name: "Legacy",
      firstName: "Legacy",
      lastName: "User",
      locale: "en",
      signedUpAt: SIGNED_UP,
      google: { googleId: "google-sub-1", picture: "pic.png" },
    });

    const report = await backfillIdentities(mongoService.user, {
      dryRun: true,
      batchSize: 500,
      now: NOW,
    });

    expect(report.matched).toBe(1);
    expect(report.modified).toBe(0);
    const stored = await mongoService.user.findOne({
      email: "legacy@example.com",
    });
    expect(stored?.identities).toBeUndefined();
  });

  it("copies google.googleId into identities and is idempotent", async () => {
    await mongoService.user.insertOne({
      email: "legacy@example.com",
      name: "Legacy User",
      firstName: "Legacy",
      lastName: "User",
      locale: "en",
      signedUpAt: SIGNED_UP,
      google: { googleId: "google-sub-1", picture: "pic.png" },
    });
    await mongoService.user.insertOne({
      email: "already@example.com",
      name: "Already",
      firstName: "Already",
      lastName: "Done",
      locale: "en",
      signedUpAt: SIGNED_UP,
      google: { googleId: "google-sub-2", picture: "pic2.png" },
      identities: [
        {
          provider: "google",
          subjectId: "google-sub-2",
          email: "already@example.com",
          linkedAt: SIGNED_UP,
        },
      ],
    });

    const first = await backfillIdentities(mongoService.user, {
      dryRun: false,
      batchSize: 500,
      now: NOW,
      sleep: async () => undefined,
    });
    expect(first.matched).toBe(1);
    expect(first.modified).toBe(1);

    const stored = await mongoService.user.findOne({
      email: "legacy@example.com",
    });
    expect(stored?.google?.googleId).toBe("google-sub-1");
    expect(stored?.identities).toEqual([
      {
        provider: "google",
        subjectId: "google-sub-1",
        email: "legacy@example.com",
        displayName: "Legacy User",
        picture: "pic.png",
        linkedAt: SIGNED_UP,
      },
    ]);

    const second = await backfillIdentities(mongoService.user, {
      dryRun: false,
      batchSize: 500,
      now: NOW,
      sleep: async () => undefined,
    });
    expect(second.matched).toBe(0);
    expect(second.modified).toBe(0);
  });
});
