import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import * as syncQueries from "@backend/sync/util/sync.queries";
import * as syncUtil from "@backend/sync/util/sync.util";
import * as userQueries from "@backend/user/queries/user.queries";
import { determineGoogleAuthMode } from "./util/google.auth.util";

jest.mock("@backend/user/queries/user.queries");
jest.mock("@backend/sync/util/sync.queries");
jest.mock("@backend/sync/util/sync.util");

const mockFindCanonicalCompassUser =
  userQueries.findCanonicalCompassUser as jest.Mock;
const mockGetSync = syncQueries.getSync as jest.Mock;
const mockCanDoIncrementalSync = syncUtil.canDoIncrementalSync as jest.Mock;

function makeCompassUser(overrides?: {
  googleId?: string;
  hasRefreshToken?: boolean;
}) {
  return {
    _id: new ObjectId(),
    google: {
      googleId: overrides?.googleId ?? faker.string.uuid(),
      gRefreshToken:
        overrides?.hasRefreshToken === false ? null : faker.string.uuid(),
    },
  };
}

describe("determineGoogleAuthMode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns SIGNUP when there is no linked Compass user", async () => {
    const googleUserId = faker.string.uuid();
    mockFindCanonicalCompassUser.mockResolvedValue(null);

    await expect(
      determineGoogleAuthMode(googleUserId, null, true),
    ).resolves.toEqual({
      authMode: "SIGNUP",
      compassUserId: null,
      hasStoredRefreshToken: false,
      hasHealthySync: false,
      createdNewRecipeUser: true,
    });

    expect(mockFindCanonicalCompassUser).toHaveBeenCalledWith({
      googleUserId,
      email: null,
    });
  });

  it("returns RECONNECT_REPAIR when the user is missing a stored refresh token", async () => {
    const user = makeCompassUser({ hasRefreshToken: false });
    mockFindCanonicalCompassUser.mockResolvedValue(user);
    mockGetSync.mockResolvedValue({
      google: { events: [{ nextSyncToken: "x" }] },
    });
    mockCanDoIncrementalSync.mockReturnValue(true);

    await expect(
      determineGoogleAuthMode(user.google.googleId, null, false),
    ).resolves.toEqual({
      authMode: "RECONNECT_REPAIR",
      compassUserId: user._id.toString(),
      hasStoredRefreshToken: false,
      hasHealthySync: true,
      createdNewRecipeUser: false,
    });
  });

  it("returns RECONNECT_REPAIR when sync is not healthy", async () => {
    const user = makeCompassUser();
    mockFindCanonicalCompassUser.mockResolvedValue(user);
    mockGetSync.mockResolvedValue({ google: { events: [] } });
    mockCanDoIncrementalSync.mockReturnValue(false);

    await expect(
      determineGoogleAuthMode(user.google.googleId, null, false),
    ).resolves.toEqual({
      authMode: "RECONNECT_REPAIR",
      compassUserId: user._id.toString(),
      hasStoredRefreshToken: true,
      hasHealthySync: false,
      createdNewRecipeUser: false,
    });
  });

  it("returns SIGNIN_INCREMENTAL when the user has a refresh token and healthy sync", async () => {
    const user = makeCompassUser();
    mockFindCanonicalCompassUser.mockResolvedValue(user);
    mockGetSync.mockResolvedValue({
      google: { events: [{ nextSyncToken: "token" }] },
    });
    mockCanDoIncrementalSync.mockReturnValue(true);

    await expect(
      determineGoogleAuthMode(user.google.googleId, null, false),
    ).resolves.toEqual({
      authMode: "SIGNIN_INCREMENTAL",
      compassUserId: user._id.toString(),
      hasStoredRefreshToken: true,
      hasHealthySync: true,
      createdNewRecipeUser: false,
    });
  });

  it("reuses a same-email Compass user when Google is not linked yet", async () => {
    const user = { _id: new ObjectId() };
    const googleUserId = faker.string.uuid();
    mockFindCanonicalCompassUser.mockResolvedValueOnce(user);
    mockGetSync.mockResolvedValue(null);

    await expect(
      determineGoogleAuthMode(googleUserId, " Existing@Example.com ", false),
    ).resolves.toEqual({
      authMode: "RECONNECT_REPAIR",
      compassUserId: user._id.toString(),
      hasStoredRefreshToken: false,
      hasHealthySync: false,
      createdNewRecipeUser: false,
    });

    expect(mockFindCanonicalCompassUser).toHaveBeenCalledWith({
      googleUserId,
      email: " Existing@Example.com ",
    });
  });
});
