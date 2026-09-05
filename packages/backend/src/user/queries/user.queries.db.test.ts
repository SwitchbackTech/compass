import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  findCanonicalCompassUser,
  identitiesProviderSubjectFilter,
} from "@backend/user/queries/user.queries";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";

const insertUser = async (overrides: {
  email: string;
  googleId?: string;
  identities?: Array<{
    provider: "google" | "microsoft" | "apple";
    subjectId: string;
    email?: string;
  }>;
}) => {
  const _id = new ObjectId();
  await mongoService.user.insertOne({
    _id,
    email: overrides.email,
    name: "Test User",
    firstName: "Test",
    lastName: "User",
    locale: "en",
    ...(overrides.googleId
      ? {
          google: {
            googleId: overrides.googleId,
            picture: "not provided",
          },
        }
      : {}),
    ...(overrides.identities
      ? {
          identities: overrides.identities.map((identity) => ({
            provider: identity.provider,
            subjectId: identity.subjectId,
            email: identity.email ?? overrides.email,
            linkedAt: new Date("2026-01-01T00:00:00.000Z"),
          })),
        }
      : {}),
  });
  return _id;
};

describe("findCanonicalCompassUser (db)", () => {
  beforeAll(() => setupTestDb(import.meta.url));
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("matches identities by provider and subjectId first", async () => {
    const userId = await insertUser({
      email: "ms@example.com",
      identities: [{ provider: "microsoft", subjectId: "ms-sub-1" }],
    });

    const found = await findCanonicalCompassUser({
      provider: "microsoft",
      subjectId: "ms-sub-1",
      email: "other@example.com",
    });

    expect(found?._id).toEqual(userId);
  });

  it("falls back to google.googleId when identities are missing", async () => {
    const userId = await insertUser({
      email: "legacy@example.com",
      googleId: "google-sub-legacy",
    });

    const found = await findCanonicalCompassUser({
      provider: "google",
      subjectId: "google-sub-legacy",
      email: "other@example.com",
    });

    expect(found?._id).toEqual(userId);
  });

  it("falls back to a verified normalized email when no identity matches", async () => {
    const userId = await insertUser({
      email: "verified@example.com",
      googleId: "google-sub-verified",
      identities: [{ provider: "google", subjectId: "google-sub-verified" }],
    });

    const found = await findCanonicalCompassUser({
      provider: "microsoft",
      subjectId: "ms-new",
      email: "  Verified@Example.com ",
    });

    expect(found?._id).toEqual(userId);
  });

  it("does not fall back onto an unverified password-only user", async () => {
    await insertUser({
      email: "password@example.com",
    });

    const found = await findCanonicalCompassUser({
      provider: "google",
      subjectId: "google-new",
      email: "password@example.com",
    });

    expect(found).toBeNull();
  });

  it("fails closed when the same email already has a different subject on that provider", async () => {
    await insertUser({
      email: "taken@example.com",
      googleId: "google-sub-a",
      identities: [{ provider: "google", subjectId: "google-sub-a" }],
    });

    const found = await findCanonicalCompassUser({
      provider: "google",
      subjectId: "google-sub-b",
      email: "taken@example.com",
    });

    expect(found).toBeNull();
  });

  it("repeats the partial-index predicate in the identity query", () => {
    expect(identitiesProviderSubjectFilter("google", "sub-1")).toEqual({
      identities: {
        $exists: true,
        $elemMatch: { provider: "google", subjectId: "sub-1" },
      },
    });
  });
});
