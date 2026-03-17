import { faker } from "@faker-js/faker";
import { BaseError } from "@core/errors/errors.base";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import GoogleOAuthClient from "./google.oauth.client";

const mockCalendar = jest.fn<unknown, [unknown]>();
const mockVerifyIdToken = jest.fn();
const mockGetAccessToken = jest.fn();

jest.mock("@googleapis/calendar", () => ({
  calendar: mockCalendar,
}));

jest.mock("google-auth-library", () => {
  class MockOAuth2Client {
    credentials: Record<string, unknown> = {};
    _clientId = "mock-client-id";
    verifyIdToken = mockVerifyIdToken;
    getAccessToken = mockGetAccessToken;
  }

  return {
    OAuth2Client: jest.fn(() => new MockOAuth2Client()),
  };
});

describe("GoogleOAuthClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a calendar client using the oauth client instance", () => {
    const gcalClient = { calendars: true };
    mockCalendar.mockReturnValue(gcalClient);

    const client = new GoogleOAuthClient();

    expect(client.getGcalClient()).toBe(gcalClient);
    expect(mockCalendar).toHaveBeenCalledWith({
      version: "v3",
      auth: client.oauthClient,
    });
  });

  it("throws when getGoogleUserInfo is called without an id token", async () => {
    const client = new GoogleOAuthClient();
    const result = client.getGoogleUserInfo();

    await expect(result).rejects.toBeInstanceOf(BaseError);
    await expect(result).rejects.toMatchObject({
      message: "oauth client is missing id_token, so couldn't verify user",
    });
  });

  it("returns decoded user info and stored tokens when an id token is present", async () => {
    const client = new GoogleOAuthClient();
    const payload = {
      sub: faker.string.uuid(),
      email: faker.internet.email(),
    };

    client.oauthClient.credentials = { id_token: "token", access_token: "abc" };
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => payload,
    });

    await expect(client.getGoogleUserInfo()).resolves.toEqual({
      gUser: payload,
      tokens: client.oauthClient.credentials,
    });

    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: "token",
      audience: "mock-client-id",
    });
  });

  it("returns the access token when refreshAccessToken receives a valid uuid", async () => {
    const client = new GoogleOAuthClient();
    const token = faker.string.uuid();
    mockGetAccessToken.mockResolvedValue({ token });

    await expect(client.refreshAccessToken()).resolves.toBe(token);
  });

  it("throws AuthError.NoGAuthAccessToken when refreshAccessToken returns an invalid token", async () => {
    const client = new GoogleOAuthClient();
    mockGetAccessToken.mockResolvedValue({ token: "not-a-uuid" });

    await expect(client.refreshAccessToken()).rejects.toMatchObject({
      description: AuthError.NoGAuthAccessToken.description,
    });
  });
});
