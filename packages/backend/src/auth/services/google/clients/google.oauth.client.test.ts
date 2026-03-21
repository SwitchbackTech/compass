import { faker } from "@faker-js/faker";
import { calendar } from "@googleapis/calendar";
import { BaseError } from "@core/errors/errors.base";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import GoogleOAuthClient from "./google.oauth.client";

jest.mock("@googleapis/calendar", () => ({
  calendar: jest.fn(),
}));

jest.mock("google-auth-library", () => {
  class MockOAuth2Client {
    credentials: Record<string, unknown> = {};
    _clientId = "mock-client-id";
    verifyIdToken = jest.fn();
    getAccessToken = jest.fn();
  }

  return {
    OAuth2Client: jest.fn(() => new MockOAuth2Client()),
  };
});

type MockOAuthClientInstance = {
  credentials: Record<string, unknown>;
  _clientId: string;
  verifyIdToken: jest.Mock;
  getAccessToken: jest.Mock;
};

const mockCalendar = jest.mocked(calendar);
const getMockOAuthClient = (
  client: GoogleOAuthClient,
): MockOAuthClientInstance =>
  client.oauthClient as unknown as MockOAuthClientInstance;

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
    const mockOAuthClient = getMockOAuthClient(client);
    const payload = {
      sub: faker.string.uuid(),
      email: faker.internet.email(),
    };

    mockOAuthClient.credentials = { id_token: "token", access_token: "abc" };
    mockOAuthClient.verifyIdToken.mockResolvedValue({
      getPayload: () => payload,
    });

    await expect(client.getGoogleUserInfo()).resolves.toEqual({
      gUser: payload,
      tokens: mockOAuthClient.credentials,
    });

    expect(mockOAuthClient.verifyIdToken).toHaveBeenCalledWith({
      idToken: "token",
      audience: "mock-client-id",
    });
  });

  it("returns the access token when refreshAccessToken receives a non-empty token", async () => {
    const client = new GoogleOAuthClient();
    const mockOAuthClient = getMockOAuthClient(client);
    const token = faker.string.uuid();
    mockOAuthClient.getAccessToken.mockResolvedValue({ token });

    await expect(client.refreshAccessToken()).resolves.toBe(token);
  });

  it("throws AuthError.NoGAuthAccessToken when refreshAccessToken returns an empty token", async () => {
    const client = new GoogleOAuthClient();
    const mockOAuthClient = getMockOAuthClient(client);
    mockOAuthClient.getAccessToken.mockResolvedValue({ token: "" });

    await expect(client.refreshAccessToken()).rejects.toMatchObject({
      description: AuthError.NoGAuthAccessToken.description,
    });
  });
});
