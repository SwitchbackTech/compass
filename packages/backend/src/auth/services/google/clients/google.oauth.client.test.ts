import { faker } from "@faker-js/faker";
import { calendar } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";
import {
  SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER,
  SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER,
} from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import { ENV } from "@backend/common/constants/env.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import GoogleOAuthClient from "./google.oauth.client";

jest.mock("@googleapis/calendar", () => ({
  calendar: jest.fn(),
}));

jest.mock("google-auth-library", () => {
  class MockOAuth2Client {
    credentials: Record<string, unknown> = {};
    _clientId = "mock-client-id";
    getToken = jest.fn();
    setCredentials = jest.fn((credentials: Record<string, unknown>) => {
      this.credentials = credentials;
    });
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
  getToken: jest.Mock;
  setCredentials: jest.Mock;
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

    expect(OAuth2Client).toHaveBeenCalledWith(
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
      "http://localhost:9080/auth/google/callback",
    );
    expect(client.getGcalClient()).toBe(gcalClient);
    expect(mockCalendar).toHaveBeenCalledWith({
      version: "v3",
      auth: client.oauthClient,
    });
  });

  it("throws when self-host placeholder credentials are configured", () => {
    const originalClientId = ENV.GOOGLE_CLIENT_ID;
    const originalClientSecret = ENV.GOOGLE_CLIENT_SECRET;
    ENV.GOOGLE_CLIENT_ID = SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER;
    ENV.GOOGLE_CLIENT_SECRET = SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER;

    try {
      expect(() => new GoogleOAuthClient()).toThrow(
        AuthError.GoogleNotConfigured.description,
      );
    } finally {
      ENV.GOOGLE_CLIENT_ID = originalClientId;
      ENV.GOOGLE_CLIENT_SECRET = originalClientSecret;
    }
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

  it("exchanges an auth code for tokens and returns the Google user info", async () => {
    const client = new GoogleOAuthClient();
    const mockOAuthClient = getMockOAuthClient(client);
    const payload = {
      sub: faker.string.uuid(),
      email: faker.internet.email(),
    };
    const tokens = {
      access_token: faker.internet.jwt(),
      id_token: "token",
      refresh_token: faker.string.uuid(),
    };

    mockOAuthClient.getToken.mockResolvedValue({ tokens });
    mockOAuthClient.verifyIdToken.mockResolvedValue({
      getPayload: () => payload,
    });

    await expect(
      client.exchangeAuthCode({
        clientType: "web",
        thirdPartyId: "google",
        redirectURIInfo: {
          redirectURIOnProviderDashboard:
            "http://localhost:9080/auth/google/callback",
          redirectURIQueryParams: { code: "auth-code" },
        },
      }),
    ).resolves.toEqual({
      gUser: payload,
      tokens,
    });

    expect(mockOAuthClient.getToken).toHaveBeenCalledWith({
      code: "auth-code",
      codeVerifier: undefined,
    });
    expect(mockOAuthClient.setCredentials).toHaveBeenCalledWith(tokens);
  });

  it("rejects auth code exchange from an unexpected redirect URI", async () => {
    const client = new GoogleOAuthClient();
    const mockOAuthClient = getMockOAuthClient(client);

    await expect(
      client.exchangeAuthCode({
        clientType: "web",
        thirdPartyId: "google",
        redirectURIInfo: {
          redirectURIOnProviderDashboard:
            "https://evil.example/auth/google/callback",
          redirectURIQueryParams: { code: "auth-code" },
        },
      }),
    ).rejects.toMatchObject({
      description: AuthError.GoogleRedirectUriMismatch.description,
    });

    expect(mockOAuthClient.getToken).not.toHaveBeenCalled();
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
